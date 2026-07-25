"use client";

import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";

import { DiagnosisRecord } from "@/types";

interface DiagnosisState {
  records: DiagnosisRecord[];
  savedRecordIds: string[];
  latestRecordId: string | null;
  setRecords: (records: DiagnosisRecord[]) => void;
  saveRecord: (id: string) => void;
  setLatestRecord: (id: string) => void;
  addGeneratedRecord: (record: DiagnosisRecord) => void;
}

type PersistedDiagnosisState = Pick<DiagnosisState, "records" | "savedRecordIds" | "latestRecordId">;

/** Only the most recent diagnoses are mirrored to storage; the session keeps the full list in memory. */
const PERSISTED_RECORD_LIMIT = 20;

/**
 * Replaces every inline `data:` payload (base64 leaf photos) with an empty string so that
 * captured images never reach localStorage. Runs on a copy: in-memory records are untouched.
 */
function stripDataUrls<T>(value: T): T {
  if (typeof value === "string") {
    return (value.startsWith("data:") ? "" : value) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => stripDataUrls(item)) as T;
  }
  if (value && typeof value === "object") {
    const source = value as Record<string, unknown>;
    const cleaned: Record<string, unknown> = {};
    for (const key of Object.keys(source)) {
      cleaned[key] = stripDataUrls(source[key]);
    }
    return cleaned as T;
  }
  return value;
}

function toTimestamp(value: string | undefined): number {
  const parsed = value ? Date.parse(value) : Number.NaN;
  return Number.isNaN(parsed) ? 0 : parsed;
}

function toPersistedRecords(records: DiagnosisRecord[]): DiagnosisRecord[] {
  return [...records]
    .sort((a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt))
    .slice(0, PERSISTED_RECORD_LIMIT)
    .map((record) => stripDataUrls(record));
}

/** localStorage can throw (quota exceeded, private mode, blocked cookies); never let that break the app. */
const safeLocalStorage: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
    } catch {
      // quota exceeded or storage blocked: keep running with in-memory state only
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch {
      // storage is unavailable; nothing else to do
    }
  },
};

export const useDiagnosisStore = create<DiagnosisState>()(
  persist(
    (set) => ({
      records: [],
      savedRecordIds: [],
      latestRecordId: null,
      setRecords: (records) =>
        set((state) => ({
          records,
          savedRecordIds: records.filter((item) => item.savedByUser).map((item) => item.id),
          latestRecordId: records[0]?.id ?? state.latestRecordId,
        })),
      saveRecord: (id) =>
        set((state) => ({
          savedRecordIds: state.savedRecordIds.includes(id)
            ? state.savedRecordIds
            : [...state.savedRecordIds, id],
          records: state.records.map((item) =>
            item.id === id ? { ...item, savedByUser: true } : item,
          ),
        })),
      setLatestRecord: (id) => set({ latestRecordId: id }),
      addGeneratedRecord: (record) =>
        set((state) => {
          const userRecords = [
            record,
            ...state.records.filter((item) => item.origin === "user" && item.id !== record.id),
          ].slice(0, 5);
          const staticRecords = state.records.filter((item) => item.origin !== "user");

          return {
            records: [...userRecords, ...staticRecords],
            latestRecordId: record.id,
          };
        }),
    }),
    {
      name: "leafiq-diagnoses",
      version: 3,
      storage: createJSONStorage(() => safeLocalStorage),
      partialize: (state): PersistedDiagnosisState => ({
        records: toPersistedRecords(state.records),
        savedRecordIds: state.savedRecordIds,
        latestRecordId: state.latestRecordId,
      }),
      migrate: (persistedState: unknown): PersistedDiagnosisState => {
        const state = (persistedState ?? {}) as Partial<DiagnosisState>;
        const records = toPersistedRecords(
          (state.records ?? []).filter((item) => item.origin === "user"),
        );
        return {
          records,
          savedRecordIds: records.filter((item) => item.savedByUser).map((item) => item.id),
          latestRecordId: records[0]?.id ?? null,
        };
      },
    },
  ),
);
