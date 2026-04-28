import { buildScopedStorageKey } from "@/lib/userScope";

const STORAGE_KEY = "csw_onboarding_v1";

export type AccountKind = "personal" | "group";

/** When accountKind is group — analytics / copy only, not on-chain. */
export type GroupLabel = "dao" | "dev_team" | "institution";

export type OnboardingRecord = {
  accountKind: AccountKind;
  groupLabel?: GroupLabel;
  completedAt: string;
};

function parseRecord(raw: string | null): OnboardingRecord | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as OnboardingRecord;
    if (v && (v.accountKind === "personal" || v.accountKind === "group") && v.completedAt) {
      return v;
    }
  } catch {
    return null;
  }
  return null;
}

export function getOnboardingRecord(): OnboardingRecord | null {
  if (typeof localStorage === "undefined") return null;
  return parseRecord(localStorage.getItem(buildScopedStorageKey(STORAGE_KEY)));
}

export function isOnboardingComplete(): boolean {
  return getOnboardingRecord() !== null;
}

export function saveOnboarding(record: Omit<OnboardingRecord, "completedAt"> & { completedAt?: string }): void {
  const full: OnboardingRecord = {
    ...record,
    completedAt: record.completedAt ?? new Date().toISOString(),
  };
  localStorage.setItem(buildScopedStorageKey(STORAGE_KEY), JSON.stringify(full));
}

export function clearOnboardingForDev(): void {
  localStorage.removeItem(buildScopedStorageKey(STORAGE_KEY));
}
