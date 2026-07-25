"""Daily climate series for the crop planner, backed by NASA POWER.

Two properties of POWER drive the shape of this module:

* it is a *historical* archive, so a planting window that starts next month has
  no observations at all;
* it reports every gap as the sentinel -999 instead of omitting the day.

Averaging those sentinels produced headline figures such as ``avg_temp_30d:
-125.38``, and inventing flat constants for future windows produced a
suitability score that was really a function of latitude. So: sentinels are
dropped, future days are filled from the same calendar window in previous years
(climatology), and a window with too few real samples is reported as unknown
rather than as a number.
"""

import json
from datetime import date, timedelta
from statistics import mean
from urllib.error import URLError
from urllib.parse import urlencode
from urllib.request import urlopen

from django.utils import timezone


NASA_POWER_BASE_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"

# POWER's documented fill value. Values are floats, so compare with a margin.
NASA_FILL_THRESHOLD = -900.0

# Years of history averaged per calendar day when a window is still ahead of us.
CLIMATOLOGY_YEARS = 3

# Below this many real observations a window average describes the gaps rather
# than the weather, so it is reported as unknown.
MIN_WINDOW_SAMPLES = 3

# The AG community serves insolation in MJ/m2/day. 3.6 converts that to
# kWh/m2/day and 0.75 turns it into the rough "hours of usable sun" figure the
# planner compares against each crop's sunlight requirement.
SUN_HOURS_DIVISOR = 3.6 * 0.75

# Series key -> POWER parameter name.
MEASUREMENTS = {
    "t2m": "T2M",
    "t2m_max": "T2M_MAX",
    "t2m_min": "T2M_MIN",
    "rh2m": "RH2M",
    "precipitation": "PRECTOTCORR",
    "solar_radiation": "ALLSKY_SFC_SW_DWN",
    "wind_speed": "WS2M",
}

SOURCE_OBSERVED = "nasa_power"
SOURCE_CLIMATOLOGY = "nasa_power_climatology"
SOURCE_MIXED = "nasa_power_mixed"
SOURCE_UNAVAILABLE = "unavailable"


class NasaPowerUnavailable(RuntimeError):
    """POWER could not be reached, or returned nothing usable."""


def _clean(value) -> float | None:
    if value is None:
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return None if number <= NASA_FILL_THRESHOLD else number


def _shift_years(value: date, years: int) -> date:
    try:
        return value.replace(year=value.year + years)
    except ValueError:  # 29 February landing on a non-leap year
        return value.replace(year=value.year + years, day=28)


def _parse_daily_payload(parameters: dict) -> list[dict]:
    rows: list[dict] = []
    for key in sorted(parameters.get("T2M", {}).keys()):
        try:
            parsed_date = date.fromisoformat(f"{key[:4]}-{key[4:6]}-{key[6:]}")
        except ValueError:
            continue
        row = {"date": parsed_date.isoformat(), "observed": True}
        for series_key, parameter in MEASUREMENTS.items():
            row[series_key] = _clean(parameters.get(parameter, {}).get(key))
        if any(row[series_key] is not None for series_key in MEASUREMENTS):
            rows.append(row)
    return rows


def _fetch_window(lat: float, lon: float, start_date: date, end_date: date) -> list[dict]:
    params = {
        "latitude": lat,
        "longitude": lon,
        "start": start_date.strftime("%Y%m%d"),
        "end": end_date.strftime("%Y%m%d"),
        "community": "AG",
        "format": "JSON",
        "parameters": ",".join(MEASUREMENTS.values()),
    }
    url = f"{NASA_POWER_BASE_URL}?{urlencode(params)}"
    try:
        with urlopen(url, timeout=30) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (URLError, TimeoutError, OSError, json.JSONDecodeError) as error:
        raise NasaPowerUnavailable(str(error)) from error

    rows = _parse_daily_payload(payload.get("properties", {}).get("parameter", {}))
    if not rows:
        raise NasaPowerUnavailable("NASA POWER returned no usable daily rows")
    return rows


def _climatology_index(rows: list[dict]) -> dict[tuple[int, int], dict[str, list[float]]]:
    index: dict[tuple[int, int], dict[str, list[float]]] = {}
    for row in rows:
        day = date.fromisoformat(row["date"])
        bucket = index.setdefault((day.month, day.day), {})
        for key in MEASUREMENTS:
            value = row.get(key)
            if value is not None:
                bucket.setdefault(key, []).append(value)
    return index


def _climatology_row(index: dict, day: date) -> dict | None:
    bucket = index.get((day.month, day.day))
    if not bucket and (day.month, day.day) == (2, 29):
        bucket = index.get((2, 28))
    if not bucket:
        return None
    row = {"date": day.isoformat(), "observed": False}
    for key in MEASUREMENTS:
        values = bucket.get(key)
        row[key] = round(mean(values), 2) if values else None
    row["sample_years"] = max((len(values) for values in bucket.values()), default=0)
    return row


def _window_values(daily_series: list[dict], key: str, days: int) -> list[float]:
    return [row[key] for row in daily_series[:days] if row.get(key) is not None]


def _mean_or_none(values: list[float], divisor: float = 1.0) -> float | None:
    if len(values) < MIN_WINDOW_SAMPLES:
        return None
    return round(mean(values) / divisor, 2)


def _sum_or_none(values: list[float]) -> float | None:
    if len(values) < MIN_WINDOW_SAMPLES:
        return None
    return round(sum(values), 2)


def _count_or_none(daily_series: list[dict], key: str, days: int, threshold: float) -> int | None:
    values = _window_values(daily_series, key, days)
    if len(values) < MIN_WINDOW_SAMPLES:
        return None
    return len([value for value in values if value >= threshold])


def _seasonality(rain_14d: float | None) -> tuple[str | None, str | None]:
    if rain_14d is None:
        return None, None
    if rain_14d >= 70:
        return "mùa mưa", "rainy season"
    if rain_14d >= 35:
        return "chuyển mùa", "season change"
    return "mùa khô", "dry season"


def derive_metrics(daily_series: list[dict]) -> dict:
    """Window aggregates, with ``None`` wherever there is not enough real data."""
    if not daily_series:
        return {}

    rain_14d = _sum_or_none(_window_values(daily_series, "precipitation", 14))
    seasonality_label, seasonality_label_en = _seasonality(rain_14d)
    dry_window_score = None
    if rain_14d is not None:
        dry_window_score = max(10, min(100, 100 - int(rain_14d)))

    return {
        "avg_temp_7d": _mean_or_none(_window_values(daily_series, "t2m", 7)),
        "avg_temp_14d": _mean_or_none(_window_values(daily_series, "t2m", 14)),
        "avg_temp_30d": _mean_or_none(_window_values(daily_series, "t2m", 30)),
        "rain_sum_7d": _sum_or_none(_window_values(daily_series, "precipitation", 7)),
        "rain_sum_14d": rain_14d,
        "humidity_avg_14d": _mean_or_none(_window_values(daily_series, "rh2m", 14)),
        "sun_hours_proxy": _mean_or_none(_window_values(daily_series, "solar_radiation", 14), SUN_HOURS_DIVISOR),
        "heat_stress_days": _count_or_none(daily_series, "t2m_max", 30, 35),
        "high_humidity_days": _count_or_none(daily_series, "rh2m", 30, 85),
        "heavy_rain_days": _count_or_none(daily_series, "precipitation", 30, 15),
        "dry_window_score": dry_window_score,
        "seasonality_label": seasonality_label,
        "seasonality_label_en": seasonality_label_en,
        "sample_days_14d": len(_window_values(daily_series, "t2m", 14)),
        "sample_days_30d": len(_window_values(daily_series, "t2m", 30)),
    }


def _unavailable(start_date: date, end_date: date, reason: str) -> dict:
    return {
        "source": SOURCE_UNAVAILABLE,
        "raw_payload": {"provider": "nasa_power", "reason": reason},
        "daily_series": [],
        "derived_metrics": {},
        "coverage": {
            "requested_days": (end_date - start_date).days + 1,
            "observed_days": 0,
            "climatology_days": 0,
            "climatology_years": 0,
        },
    }


def fetch_nasa_power(lat: float, lon: float, start_date: date, end_date: date) -> dict:
    """Daily series for [start_date, end_date], observed where POWER has data.

    A single request covers both needs: it reaches back ``CLIMATOLOGY_YEARS``
    before the window so the future part can be filled with the average of the
    same calendar days in previous years.
    """
    today = timezone.localdate()
    last_observable = min(end_date, today - timedelta(days=1))
    history_start = _shift_years(start_date, -CLIMATOLOGY_YEARS)

    if last_observable < history_start:
        return _unavailable(start_date, end_date, "requested window predates the POWER archive")

    try:
        rows = _fetch_window(lat, lon, history_start, last_observable)
    except NasaPowerUnavailable as error:
        return _unavailable(start_date, end_date, str(error))

    observed_by_date = {row["date"]: row for row in rows}
    climatology = _climatology_index(rows)

    daily_series: list[dict] = []
    observed_days = 0
    climatology_days = 0
    current = start_date
    while current <= end_date:
        row = observed_by_date.get(current.isoformat())
        if row is not None:
            daily_series.append(row)
            observed_days += 1
        else:
            filled = _climatology_row(climatology, current)
            if filled is not None:
                daily_series.append(filled)
                climatology_days += 1
        current += timedelta(days=1)

    if not daily_series:
        return _unavailable(start_date, end_date, "no observations or climatology for this window")

    if climatology_days == 0:
        source = SOURCE_OBSERVED
    elif observed_days == 0:
        source = SOURCE_CLIMATOLOGY
    else:
        source = SOURCE_MIXED

    return {
        "source": source,
        # The full POWER response is several years of daily rows; only the
        # provenance is worth persisting on the snapshot.
        "raw_payload": {
            "provider": "nasa_power",
            "history_start": history_start.isoformat(),
            "history_end": last_observable.isoformat(),
            "history_rows": len(rows),
        },
        "daily_series": daily_series,
        "derived_metrics": derive_metrics(daily_series),
        "coverage": {
            "requested_days": (end_date - start_date).days + 1,
            "observed_days": observed_days,
            "climatology_days": climatology_days,
            "climatology_years": CLIMATOLOGY_YEARS,
        },
    }
