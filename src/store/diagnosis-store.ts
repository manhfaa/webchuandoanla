"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { mockDiagnoses } from "@/data/mock/diagnoses";
import { DiagnosisRecord } from "@/types";

interface DiagnosisState {
  records: DiagnosisRecord[];
  savedRecordIds: string[];
  latestRecordId: string | null;
  saveRecord: (id: string) => void;
  setLatestRecord: (id: string) => void;
  addGeneratedRecord: (record: DiagnosisRecord) => void;
}

export const useDiagnosisStore = create<DiagnosisState>()(
  persist(
    (set) => ({
      records: mockDiagnoses,
      savedRecordIds: ["demo-corn-blight"],
      latestRecordId: "demo-corn-blight",
      saveRecord: (id) =>
        set((state) => ({
          savedRecordIds: state.savedRecordIds.includes(id)
            ? state.savedRecordIds
            : [...state.savedRecordIds, id],
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
    },
  ),
);
