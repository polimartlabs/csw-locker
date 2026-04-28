const USER_SCOPE_KEY = "csw_user_scope_key";

function normalizeScope(raw: string | null): string | null {
  const scope = raw?.trim().toLowerCase();
  return scope ? scope : null;
}

export function getActiveUserScope(): string | null {
  if (typeof localStorage === "undefined") return null;
  return normalizeScope(localStorage.getItem(USER_SCOPE_KEY));
}

export function buildScopedStorageKey(baseKey: string): string {
  const scope = getActiveUserScope();
  return scope ? `${baseKey}::${scope}` : baseKey;
}

export function migrateLegacyStorageValue<T = unknown>(baseKey: string): T | null {
  if (typeof localStorage === "undefined") return null;
  const scopedKey = buildScopedStorageKey(baseKey);
  const scopedRaw = localStorage.getItem(scopedKey);
  if (scopedRaw != null) {
    try {
      return JSON.parse(scopedRaw) as T;
    } catch {
      return null;
    }
  }
  const legacyRaw = localStorage.getItem(baseKey);
  if (legacyRaw == null || scopedKey === baseKey) return null;
  localStorage.setItem(scopedKey, legacyRaw);
  try {
    return JSON.parse(legacyRaw) as T;
  } catch {
    return null;
  }
}

