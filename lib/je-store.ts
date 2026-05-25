// Simple client-side store for generated Journal Entries
// In production, this would be a database

export interface GeneratedJE {
  id: string
  txId: string
  txHash: string
  jeNumber: string
  date: string
  eventType: string
  asset: string
  debitAccount: string
  creditAccount: string
  amount: number
  memo: string
  createdAt: string
  status: "Draft" | "Pending" | "Approved"
  source: "auto" | "manual"
  lastModified?: string
  modifiedReason?: string
}

// In-memory store (would be replaced with API calls in production)
let generatedJEs: GeneratedJE[] = []
let listeners: Array<() => void> = []

export function getGeneratedJEs(): GeneratedJE[] {
  return [...generatedJEs]
}

export function addGeneratedJE(je: GeneratedJE): void {
  // Check if JE already exists for this transaction
  const existingIndex = generatedJEs.findIndex(j => j.txId === je.txId)
  if (existingIndex >= 0) {
    // Update existing
    generatedJEs[existingIndex] = {
      ...je,
      lastModified: new Date().toISOString(),
      modifiedReason: "Regenerated",
    }
  } else {
    generatedJEs.push(je)
  }
  notifyListeners()
}

export function getJEForTransaction(txId: string): GeneratedJE | undefined {
  return generatedJEs.find(j => j.txId === txId)
}

export function getJEById(jeId: string): GeneratedJE | undefined {
  return generatedJEs.find(j => j.id === jeId)
}

export function approveJE(jeId: string): boolean {
  const index = generatedJEs.findIndex(j => j.id === jeId)
  if (index >= 0 && generatedJEs[index].status !== "Approved") {
    generatedJEs[index] = {
      ...generatedJEs[index],
      status: "Approved",
      lastModified: new Date().toISOString(),
      modifiedReason: "Approved by reviewer",
    }
    notifyListeners()
    return true
  }
  return false
}

export function hasJEForTransaction(txId: string): boolean {
  return generatedJEs.some(j => j.txId === txId)
}

export function subscribe(listener: () => void): () => void {
  listeners.push(listener)
  return () => {
    listeners = listeners.filter(l => l !== listener)
  }
}

function notifyListeners() {
  listeners.forEach(l => l())
}

// Generate a sequential JE number
let jeCounter = 37 // Start after existing mock JEs
export function getNextJENumber(): string {
  jeCounter++
  return `JE-2025-${String(jeCounter).padStart(3, "0")}`
}
