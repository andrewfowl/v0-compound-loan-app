import "server-only";

const BACKEND_API_BASE_URL = process.env.BACKEND_API_BASE_URL;
const BACKEND_PROXY_USER_ID =
  process.env.BACKEND_PROXY_USER_ID || "frontend-demo";

type BackendFetchOptions = {
  method?: "GET" | "POST";
  body?: unknown;
};

function ensureBackendUrl() {
  if (!BACKEND_API_BASE_URL) {
    throw new Error("Missing BACKEND_API_BASE_URL environment variable");
  }
  return BACKEND_API_BASE_URL;
}

async function backendFetch(path: string, options: BackendFetchOptions = {}) {
  const baseUrl = ensureBackendUrl();
  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  headers.set("x-user-id", BACKEND_PROXY_USER_ID);

  const response = await fetch(`${baseUrl}${path}`, {
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
