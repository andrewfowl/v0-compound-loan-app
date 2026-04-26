"use client"

import type { BorrowerRecon } from "@/lib/compound/types"
import { formatUsd } from "@/lib/compound/format"

interface CollateralRiskBannerProps {
  borrowerRecon: BorrowerRecon
}

export function CollateralRiskBanner({ borrowerRecon }: CollateralRiskBannerProps) {
  if (borrowerRecon.currentDebt <= 0) return null

  const ltv = borrowerRecon.currentLtv
  const totalCollateral = borrowerRecon.currentCollateral
  const atRiskUsd = Math.max(0, borrowerRecon.currentDebt)
  const bufferUsd = Math.max(0, totalCollateral * 0.80 - borrowerRecon.currentDebt)
  const pctAtRisk = totalCollateral > 0 ? (atRiskUsd / totalCollateral) * 100 : 0

  if (ltv < 0.50) return null // healthy — no banner needed

  const cfg =
    ltv >= 0.80 ? {
      border: "border-red-300 dark:border-red-800",
      bg: "bg-red-50 dark:bg-red-950/30",
      title: "CRITICAL — Collateral Seizure Imminent",
      body: "LTV has breached 80%. Liquidators can seize your collateral now.",
      ltvColor: "text-red-500",
    } :
    ltv >= 0.65 ? {
      border: "border-amber-300 dark:border-amber-800",
      bg: "bg-amber-50 dark:bg-amber-950/20",
      title: "AT RISK — Collateral May Be Seized",
      body: `Only ${formatUsd(bufferUsd)} separates you from the 80% liquidation threshold.`,
      ltvColor: "text-amber-500",
    } : {
      border: "border-yellow-300 dark:border-yellow-800",
      bg: "bg-yellow-50 dark:bg-yellow-950/10",
      title: "MONITOR — Collateral Under Pressure",
      body: `LTV is ${(ltv * 100).toFixed(1)}%. A further price move or withdrawal could push you into the at-risk zone.`,
      ltvColor: "text-yellow-500",
    }

  return (
    <div className={`mb-4 rounded-xl border ${cfg.border} ${cfg.bg} px-5 py-4 space-y-3`}>
      <div className="flex items-center gap-2">
        <p className="font-bold text-sm">{cfg.title}</p>
      </div>
      <p className="text-xs text-muted-foreground">{cfg.body}</p>
      <div className="grid grid-cols-3 gap-3 pt-1">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-0.5">Current LTV</p>
          <p className={`font-mono font-bold text-sm ${cfg.ltvColor}`}>
            {(ltv * 100).toFixed(1)}%
          </p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-0.5">Collateral at Risk</p>
          <p className="font-mono font-bold text-sm text-red-500">
            {formatUsd(atRiskUsd)}
            <span className="text-muted-foreground font-normal text-[10px] ml-1">({pctAtRisk.toFixed(0)}% of total)</span>
          </p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-0.5">Buffer to Liquidation</p>
          <p className={`font-mono font-bold text-sm ${bufferUsd <= 0 ? "text-red-500" : ""}`}>
            {bufferUsd <= 0 ? "LIQUIDATABLE NOW" : formatUsd(bufferUsd)}
          </p>
        </div>
      </div>
    </div>
  )
}
