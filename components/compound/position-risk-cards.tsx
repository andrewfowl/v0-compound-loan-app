"use client"

import type { PositionRisk } from "@/lib/compound/types"
import { formatUsd } from "@/lib/compound/format"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { HelpCircle } from "lucide-react"

interface PositionRiskCardsProps {
  positions: PositionRisk[]
}

export function PositionRiskCards({ positions }: PositionRiskCardsProps) {
  if (positions.length === 0) return null

  return (
    <div className="space-y-3 mb-6">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-1">
        Loan Risk — Per Position
      </p>
      <TooltipProvider>
        {positions.map((pos) => {
          const ltvColor =
            pos.riskLevel === "critical" ? "text-red-500" :
            pos.riskLevel === "at-risk" ? "text-amber-500" :
            pos.riskLevel === "monitor" ? "text-yellow-500" :
            "text-green-500"
          const badgeColor =
            pos.riskLevel === "critical" ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" :
            pos.riskLevel === "at-risk" ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" :
            pos.riskLevel === "monitor" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300" :
            "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
          const borderColor =
            pos.riskLevel === "critical" ? "border-red-300 dark:border-red-800" :
            pos.riskLevel === "at-risk" ? "border-amber-300 dark:border-amber-800" :
            pos.riskLevel === "monitor" ? "border-yellow-300 dark:border-yellow-800" :
            "border-border"
          const badgeLabel =
            pos.riskLevel === "critical" ? "CRITICAL" :
            pos.riskLevel === "at-risk" ? "AT RISK" :
            pos.riskLevel === "monitor" ? "MONITOR" : "LOW"

          return (
            <div key={pos.asset} className={`grid grid-cols-3 gap-0 rounded-xl border ${borderColor} bg-card overflow-hidden`}>
              {/* Total Debt */}
              <div className="px-4 py-3 border-r">
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">
                  {pos.asset} — Total Debt
                </p>
                <p className="font-mono font-bold text-red-500 text-lg">
                  {formatUsd(pos.debtUsd)}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {pos.units.toLocaleString("en-US", { maximumFractionDigits: 4 })} {pos.asset} · {formatUsd(pos.price)}/unit
                </p>
              </div>
              {/* LTV Ratio */}
              <div className="px-4 py-3 border-r">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1 cursor-help inline-flex items-center gap-1">
                      LTV Ratio
                      <HelpCircle className="size-3 text-muted-foreground/60" />
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
                <p className={`font-mono font-bold text-lg ${ltvColor}`}>
                  {isFinite(pos.ltv) ? `${(pos.ltv * 100).toFixed(1)}%` : "∞"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Debt / Collateral · Liq. at 80%</p>
              </div>
              {/* Liquidation Risk */}
              <div className="px-4 py-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1 cursor-help inline-flex items-center gap-1">
                      Liquidation Risk
                      <HelpCircle className="size-3 text-muted-foreground/60" />
                    </p>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <div className="space-y-1.5">
                      <p className="font-semibold text-sm">Liquidation Risk Assessment</p>
                      <p className="text-xs"><strong>LOW:</strong> LTV &lt; 50% — Safe zone</p>
                      <p className="text-xs"><strong>MONITOR:</strong> LTV 50–65% — Watch for price changes</p>
                      <p className="text-xs"><strong>AT RISK:</strong> LTV 65–80% — Margin squeeze imminent</p>
                      <p className="text-xs"><strong>CRITICAL:</strong> LTV ≥ 80% — Liquidators active NOW</p>
                      <p className="text-xs text-muted-foreground mt-2">Based on on-chain LTV from Compound Protocol.</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
                <span className={`inline-block text-sm font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>
                  {badgeLabel}
                </span>
                <p className="text-[11px] text-muted-foreground mt-1.5">Based on LTV</p>
              </div>
            </div>
          )
        })}
      </TooltipProvider>
    </div>
  )
}
