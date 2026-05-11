// Shared mock data for the application
// This file centralizes sample data used across pages

export type JobStatus = "queued" | "processing" | "completed" | "failed"

export interface Job {
  id: string
  walletAddress: string
  walletLabel?: string
  status: JobStatus
  period: string
  startedAt: string
  completedAt?: string
  progress?: number
  network?: string
  reportsGenerated?: number
}

export interface WalletPosition {
  asset: string
  protocol: string
  protocolVersion: "v2" | "v3"
  principal: number
  principalUsd: number
  collateralRatio: number
}

export interface RecentActivity {
  date: string
  type: "Supply" | "Borrow" | "Repay" | "Withdraw"
  asset: string
  amount: number
}

export interface WalletInfo {
  address: string
  label: string
  network: string
}

// Sample wallet addresses
export const SAMPLE_WALLETS: WalletInfo[] = [
  { address: "0xd043c56861F3e80b2C5580d7044a6771F802565D", label: "Treasury 1", network: "Ethereum" },
  { address: "0x462cbA2dC7e2709143BcaCC86ec106354cf82108", label: "Treasury 2", network: "Ethereum" },
  { address: "0xCB1096E77d6eAb734ffCEcd1Fcd2D35EE6b8d15", label: "Operations", network: "Ethereum" },
  { address: "0x1f2c3d4e5a6b7c8d9e0f1a2b3c4d5e6f7a8b9a1f", label: "DeFi Vault", network: "Arbitrum" },
  { address: "0x3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c5b2a", label: "Liquidity Pool", network: "Polygon" },
]

// Mock jobs data
export const mockJobs: Job[] = [
  { 
    id: "job_1", 
    walletAddress: "0xd043c56861F3e80b2C5580d7044a6771F802565D",
    walletLabel: "Treasury 1",
    status: "completed", 
    period: "2025-03", 
    startedAt: "2025-03-28T10:00:00Z", 
    completedAt: "2025-03-28T10:02:30Z",
    network: "Ethereum",
    reportsGenerated: 12,
  },
  { 
    id: "job_2", 
    walletAddress: "0x462cbA2dC7e2709143BcaCC86ec106354cf82108",
    walletLabel: "Treasury 2",
    status: "processing", 
    period: "2025-03", 
    startedAt: "2025-03-28T10:05:00Z", 
    progress: 67,
    network: "Ethereum",
  },
  { 
    id: "job_3", 
    walletAddress: "0xCB1096E77d6eAb734ffCEcd1Fcd2D35EE6b8d15",
    walletLabel: "Operations",
    status: "queued", 
    period: "2025-03", 
    startedAt: "2025-03-28T10:06:00Z",
    network: "Ethereum",
  },
  { 
    id: "job_4", 
    walletAddress: "0x1f2c3d4e5a6b7c8d9e0f1a2b3c4d5e6f7a8b9a1f",
    walletLabel: "DeFi Vault",
    status: "completed", 
    period: "2025-02", 
    startedAt: "2025-02-28T14:30:00Z", 
    completedAt: "2025-02-28T14:35:15Z",
    network: "Arbitrum",
    reportsGenerated: 8,
  },
  { 
    id: "job_5", 
    walletAddress: "0x3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c5b2a",
    walletLabel: "Liquidity Pool",
    status: "failed", 
    period: "2025-02", 
    startedAt: "2025-02-27T09:15:00Z",
    network: "Polygon",
  },
  { 
    id: "job_6", 
    walletAddress: "0xd043c56861F3e80b2C5580d7044a6771F802565D",
    walletLabel: "Treasury 1",
    status: "completed", 
    period: "2025-01", 
    startedAt: "2025-01-31T11:45:00Z", 
    completedAt: "2025-01-31T11:52:00Z",
    network: "Ethereum",
    reportsGenerated: 10,
  },
]

export const mockPositions: WalletPosition[] = [
  { asset: "USDC", protocol: "cUSDCv3", protocolVersion: "v3", principal: 2847500, principalUsd: 2847500, collateralRatio: 149 },
  { asset: "USDC", protocol: "cUSDC", protocolVersion: "v2", principal: 1100000, principalUsd: 1100000, collateralRatio: 128 },
  { asset: "ETH", protocol: "cETH", protocolVersion: "v2", principal: 0.077, principalUsd: 270900, collateralRatio: 210 },
]

export const mockActivity: RecentActivity[] = [
  { date: "Mar 28", type: "Repay", asset: "USDC", amount: 500000 },
  { date: "Mar 15", type: "Supply", asset: "WBTC", amount: 240000 },
  { date: "Mar 02", type: "Borrow", asset: "USDC", amount: 1100000 },
  { date: "Feb 18", type: "Supply", asset: "ETH", amount: 3200000 },
  { date: "Feb 01", type: "Borrow", asset: "USDC", amount: 2847500 },
]

// Helper functions
export function formatAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", { 
    style: "currency", 
    currency: "USD", 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 0 
  }).format(value)
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value)
}
