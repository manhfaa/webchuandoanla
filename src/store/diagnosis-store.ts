"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

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
      version: 2,
      migrate: (persistedState: unknown) => {
        const state = (persistedState ?? {}) as Partial<DiagnosisState>;
        const records = (state.records ?? []).filter((item) => item.origin === "user");
        return {
          ...state,
          records,
          savedRecordIds: records.filter((item) => item.savedByUser).map((item) => item.id),
          latestRecordId: records[0]?.id ?? null,
        };
      },
    },
  ),
);
