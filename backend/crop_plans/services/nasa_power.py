import json
from datetime import date, timedelta
from statistics import mean
from urllib.error import URLError
from urllib.parse import urlencode
from urllib.request import urlopen


NASA_POWER_BASE_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"


def _parse_daily_payload(parameters: dict) -> list[dict]:
    rows: list[dict] = []
    date_keys = sorted(parameters.get("T2M", {}).keys())
    for key in date_keys:
        parsed_date = date.fromisoformat(f"{key[:4]}-{key[4:6]}-{key[6:]}")
        rows.append(
            {
                "date": parsed_date.isoformat(),
                "t2m": float(parameters.get("T2M", {}).get(key) or 0),
                "t2m_max": float(parameters.get("T2M_MAX", {}).get(key) or 0),
                "t2m_min": float(parameters.get("T2M_MIN", {}).get(key) or 0),
                "rh2m": float(parameters.get("RH2M", {}).get(key) or 0),
                "precipitation": float(parameters.get("PRECTOTCORR", {}).get(key) or 0),
                "solar_radiation": float(parameters.get("ALLSKY_SFC_SW_DWN", {}).get(key) or 0),
                "wind_speed": float(parameters.get("WS2M", {}).get(key) or 0),
            }
        )
    return rows


def _fallback_daily_series(lat: float, start_date: date, end_date: date) -> list[dict]:
    days = (end_date - start_date).days + 1
    humidity_bias = 78 if lat < 15 else 70
    result: list[dict] = []
    for offset in range(days):
        current = start_date + timedelta(days=offset)
        rain = 10 if offset % 4 == 0 else 3
        result.append(
            {
                "date": current.isoformat(),
                "t2m": 28.0,
                "t2m_max": 32.0,
                "t2m_min": 24.0,
                "rh2m": humidity_bias,
                "precipitation": rain,
                "solar_radiation": 5.8,
                "wind_speed": 1.8,
            }
        )
    return result


def derive_metrics(daily_series: list[dict]) -> dict:
    if not daily_series:
        return {}

    def _window_values(key: str, days: int) -> list[float]:
        return [float(row[key]) for row in daily_series[:days] if row.get(key) is not None]

    first_7 = _window_values("t2m", 7)
    first_14_temp = _window_values("t2m", 14)
    first_30_temp = _window_values("t2m", 30)
    first_7_rain = _window_values("precipitation", 7)
    first_14_rain = _window_values("precipitation", 14)
    first_14_humidity = _window_values("rh2m", 14)
    first_14_solar = _window_values("solar_radiation", 14)

    return {
        "avg_temp_7d": round(mean(first_7), 2) if first_7 else 0,
        "avg_temp_14d": round(mean(first_14_temp), 2) if first_14_temp else 0,
        "avg_temp_30d": round(mean(first_30_temp), 2) if first_30_temp else 0,
        "rain_sum_7d": round(sum(first_7_rain), 2) if first_7_rain else 0,
        "rain_sum_14d": round(sum(first_14_rain), 2) if first_14_rain else 0,
        "humidity_avg_14d": round(mean(first_14_humidity), 2) if first_14_humidity else 0,
        "sun_hours_proxy": round(mean(first_14_solar) / 0.75, 2) if first_14_solar else 0,
        "heat_stress_days": len([row for row in daily_series[:30] if row["t2m_max"] >= 35]),
        "high_humidity_days": len([row for row in daily_series[:30] if row["rh2m"] >= 85]),
        "heavy_rain_days": len([row for row in daily_series[:30] if row["precipitation"] >= 15]),
        "dry_window_score": max(10, 100 - int(sum(first_14_rain))) if first_14_rain else 50,
        "seasonality_label": "mùa mưa"
        if sum(first_14_rain) >= 70
        else "chuyển mùa"
        if sum(first_14_rain) >= 35
        else "mùa khô",
    }


def fetch_nasa_power(lat: float, lon: float, start_date: date, end_date: date) -> dict:
    params = {
        "latitude": lat,
        "longitude": lon,
        "start": start_date.strftime("%Y%m%d"),
        "end": end_date.strftime("%Y%m%d"),
        "community": "AG",
        "format": "JSON",
        "parameters": "T2M,T2M_MAX,T2M_MIN,RH2M,PRECTOTCORR,ALLSKY_SFC_SW_DWN,WS2M",
    }
    url = f"{NASA_POWER_BASE_URL}?{urlencode(params)}"

    try:
        with urlopen(url, timeout=20) as response:
            payload = json.loads(response.read().decode("utf-8"))
        parameters = payload.get("properties", {}).get("parameter", {})
        daily_series = _parse_daily_payload(parameters)
        if not daily_series:
            raise ValueError("NASA response missing daily data")
        return {
            "source": "nasa_power",
            "raw_payload": payload,
            "daily_series": daily_series,
            "derived_metrics": derive_metrics(daily_series),
        }
    except (URLError, TimeoutError, ValueError, json.JSONDecodeError):
        fallback_series = _fallback_daily_series(lat, start_date, end_date)
        return {
            "source": "fallback",
            "raw_payload": {"fallback": True, "reason": "nasa_power_unavailable"},
            "daily_series": fallback_series,
            "derived_metrics": derive_metrics(fallback_series),
        }
