"use client"

import type { BorrowerRecon } from "@/lib/compound/types"
import { formatUsd } from "@/lib/compound/format"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { HelpCircle } from "lucide-react"

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
      border: "border-destructive/40",
      bg: "bg-destructive-muted",
      title: "CRITICAL — Collateral Seizure Imminent",
      body: "LTV has breached 80%. Liquidators can seize your collateral now.",
      ltvColor: "text-destructive",
    } :
    ltv >= 0.65 ? {
      border: "border-warning/40",
      bg: "bg-warning-muted",
      title: "AT RISK — Collateral May Be Seized",
      body: `Only ${formatUsd(bufferUsd)} separates you from the 80% liquidation threshold.`,
      ltvColor: "text-warning",
    } : {
      border: "border-warning/30",
      bg: "bg-warning-muted/50",
      title: "MONITOR — Collateral Under Pressure",
      body: `LTV is ${(ltv * 100).toFixed(1)}%. A further price move or withdrawal could push you into the at-risk zone.`,
      ltvColor: "text-warning/80",
    }

  return (
    <div className={`mb-4 rounded-xl border ${cfg.border} ${cfg.bg} px-5 py-4 space-y-3`}>
      <div className="flex items-center gap-2">
        <p className="font-bold text-sm">{cfg.title}</p>
      </div>
      <p className="text-xs text-muted-foreground">{cfg.body}</p>
      <div className="grid grid-cols-3 gap-3 pt-1">
        <TooltipProvider>
          <div>
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-0.5 cursor-help inline-flex items-center gap-0.5">
                  Current LTV
                  <HelpCircle className="size-3 text-muted-foreground/50" />
                </p>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <div className="space-y-1.5">
                  <p className="font-semibold text-sm">Loan-to-Value Ratio</p>
                  <p className="text-xs">Calculated as: Total Debt USD ÷ Total Collateral USD</p>
                  <p className="text-xs">Liquidation occurs when LTV exceeds 80%. Compound Protocol auto-liquidates at this threshold. Source: Chainlink price feeds via Compound oracle.</p>
                </div>
              </TooltipContent>
            </Tooltip>
            <p className={`font-mono font-bold text-sm ${cfg.ltvColor}`}>
              {(ltv * 100).toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-0.5">Collateral at Risk</p>
            <p className="font-mono font-bold text-sm text-negative">
              {formatUsd(atRiskUsd)}
              <span className="text-muted-foreground font-normal text-[10px] ml-1">({pctAtRisk.toFixed(0)}% of total)</span>
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-0.5">Buffer to Liquidation</p>
            <p className={`font-mono font-bold text-sm ${bufferUsd <= 0 ? "text-destructive" : ""}`}>
              {bufferUsd <= 0 ? "LIQUIDATABLE NOW" : formatUsd(bufferUsd)}
            </p>
          </div>
        </TooltipProvider>
      </div>
    </div>
  )
}
