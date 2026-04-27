import "server-only";

const BACKEND_API_BASE_URL = process.env.BACKEND_API_BASE_URL;
const BACKEND_PROXY_USER_ID =
  process.env.BACKEND_PROXY_USER_ID || "frontend-demo";

// User IDs to try when fetching sample wallet data
export const SAMPLE_USER_IDS = ["user_123", "frontend-demo"];

type BackendFetchOptions = {
  method?: "GET" | "POST";
  body?: unknown;
  userId?: string; // override the default user ID
};

function ensureBackendUrl() {
  if (!BACKEND_API_BASE_URL) {
    throw new Error("Missing BACKEND_API_BASE_URL environment variable");
  }
  // Ensure the URL has a protocol
  if (!BACKEND_API_BASE_URL.startsWith("http://") && !BACKEND_API_BASE_URL.startsWith("https://")) {
    return `https://${BACKEND_API_BASE_URL}`;
  }
  return BACKEND_API_BASE_URL;
}

async function backendFetch(path: string, options: BackendFetchOptions = {}) {
  const baseUrl = ensureBackendUrl();
  const userId = options.userId || BACKEND_PROXY_USER_ID;
  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  headers.set("x-user-id", userId);

  const fullUrl = `${baseUrl}${path}`;

  const response = await fetch(fullUrl, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => "");

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload && "error" in payload
        ? String((payload as { error: unknown }).error)
        : typeof payload === "string" && payload
          ? payload
          : `Backend request failed with status ${response.status}`;

    throw new Error(message);
  }

  return payload;
}

export async function createIndexingJob(input: {
  walletAddress: string;
  walletStartDate: string;
  reportStartDate: string;
  reportEndMonth: string;
  frequency: "monthly" | "quarterly" | "adhoc";
  protocolScope: Array<"v2" | "v3">;
  priceSourceMode: string;
}) {
  return backendFetch("/api/wallet-jobs", {
    method: "POST",
    body: input,
  });
}

export async function getIndexingJob(jobId: string) {
  return backendFetch(`/api/wallet-jobs/${jobId}`, {
    method: "GET",
  });
}

export async function getIndexingReport(walletId: string, period: string) {
  const qs = new URLSearchParams({
    walletId,
    period,
  });

  return backendFetch(`/api/reports?${qs.toString()}`, {
    method: "GET",
  });
}

export async function listWallets() {
  return backendFetch("/api/wallets", {
    method: "GET",
  });
}

/**
 * Get indexed wallet info with available periods for a given user.
 * Queries a single userId; call multiple times and merge to cover multiple users.
 */
export async function getWalletCatalog(address?: string, userId?: string) {
  const path = address
    ? `/api/wallet-catalog?address=${encodeURIComponent(address)}`
    : "/api/wallet-catalog";
  return backendFetch(path, { method: "GET", userId });
}

/**
 * Fetch wallet catalog for multiple user IDs and merge availablePeriods.
 * Safe — silently skips any user ID that returns no data or errors.
 */
export async function getWalletCatalogMultiUser(
  address: string,
  userIds: string[]
) {
  const results = await Promise.allSettled(
    userIds.map((uid) => getWalletCatalog(address, uid))
  );

  const merged: { walletId?: string; availablePeriods: string[] } = {
    availablePeriods: [],
  };

  for (const result of results) {
    if (result.status !== "fulfilled" || !result.value) continue;
    const data = result.value;
    if (!merged.walletId && data.walletId) merged.walletId = data.walletId;
    const periods: string[] = data.availablePeriods || [];
    for (const p of periods) {
      if (!merged.availablePeriods.includes(p)) {
        merged.availablePeriods.push(p);
      }
    }
  }

  merged.availablePeriods.sort();
  return merged;
}

/**
 * Get saved reports for a wallet by address, optionally filtered by period.
 */
export async function getWalletReports(
  address: string,
  period?: string,
  userId?: string
) {
  const qs = new URLSearchParams({ address });
  if (period) qs.set("period", period);
  return backendFetch(`/api/wallet-reports?${qs.toString()}`, {
    method: "GET",
    userId,
  });
}

/**
 * Discover available report periods for a wallet by querying wallet-reports.
 * Returns array of period strings (e.g., ["2021-04", "2021-05"]).
 */
export async function discoverWalletPeriods(
  address: string,
  userId?: string
): Promise<string[]> {
  try {
    const data = await getWalletReports(address, undefined, userId);
    // Handle various response formats
    if (Array.isArray(data)) {
      // Array of reports with period field
      return data.map((r: { period?: string }) => r.period).filter(Boolean) as string[];
    }
    if (data?.reports && Array.isArray(data.reports)) {
      return data.reports.map((r: { period?: string }) => r.period).filter(Boolean) as string[];
    }
    if (data?.periods && Array.isArray(data.periods)) {
      return data.periods;
    }
    if (data?.availablePeriods && Array.isArray(data.availablePeriods)) {
      return data.availablePeriods;
    }
    // Single report object with period
    if (data?.period) {
      return [data.period];
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Discover periods from wallet-reports for multiple user IDs, merge results.
 */
export async function discoverWalletPeriodsMultiUser(
  address: string,
  userIds: string[]
): Promise<string[]> {
  const results = await Promise.allSettled(
    userIds.map((uid) => discoverWalletPeriods(address, uid))
  );

  const allPeriods = new Set<string>();
  for (const result of results) {
    if (result.status === "fulfilled") {
      for (const p of result.value) {
        allPeriods.add(p);
      }
    }
  }

  return Array.from(allPeriods).sort();
}
