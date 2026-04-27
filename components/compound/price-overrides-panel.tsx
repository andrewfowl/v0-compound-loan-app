"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Info, RotateCcw } from "lucide-react"

export type PriceOverrides = Record<string, number>

interface PriceOverridesPanelProps {
  /** Asset symbols detected from the report */
  assets: string[]
  /** Current price overrides */
  overrides: PriceOverrides
  /** Called when user changes any price */
  onChange: (overrides: PriceOverrides) => void
}

/** Well-known reference prices used as placeholders only — user must confirm or change */
const REFERENCE_PRICES: Record<string, number> = {
  WETH:  3200,
  ETH:   3200,
  WBTC:  65000,
  BTC:   65000,
  USDC:  1,
  USDT:  1,
  DAI:   1,
  COMP:  60,
  LINK:  15,
  UNI:   10,
  AAVE:  100,
}

export function PriceOverridesPanel({ assets, overrides, onChange }: PriceOverridesPanelProps) {
  const [localValues, setLocalValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const asset of assets) {
      init[asset] = overrides[asset] != null
        ? String(overrides[asset])
        : REFERENCE_PRICES[asset] != null
          ? String(REFERENCE_PRICES[asset])
          : ""
    }
    return init
  })

  function handleChange(asset: string, raw: string) {
    setLocalValues((prev) => ({ ...prev, [asset]: raw }))
    const num = parseFloat(raw)
    if (!isNaN(num) && num > 0) {
      onChange({ ...overrides, [asset]: num })
    } else {
      const next = { ...overrides }
      delete next[asset]
      onChange(next)
    }
  }

  function handleReset(asset: string) {
    const ref = REFERENCE_PRICES[asset]
    const raw = ref != null ? String(ref) : ""
    setLocalValues((prev) => ({ ...prev, [asset]: raw }))
    if (ref != null) {
      onChange({ ...overrides, [asset]: ref })
    } else {
      const next = { ...overrides }
      delete next[asset]
      onChange(next)
    }
  }

  function handleResetAll() {
    const next: PriceOverrides = {}
    const nextLocal: Record<string, string> = {}
    for (const asset of assets) {
      const ref = REFERENCE_PRICES[asset]
      if (ref != null) {
        next[asset] = ref
        nextLocal[asset] = String(ref)
      } else {
        nextLocal[asset] = ""
      }
    }
    setLocalValues(nextLocal)
    onChange(next)
  }

  if (assets.length === 0) return null

  const activeCount = assets.filter((a) => overrides[a] != null).length

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              Principal Market Prices
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">
                    Enter prices from your principal market (e.g. Coinbase, Kraken, CMC).
                    Fair Value adjustments are calculated as:<br /><br />
                    <strong>FV Adj = End Balance × (Your Price − Implied On-Chain Price)</strong><br /><br />
                    Implied price is derived from each event&apos;s amountUsd ÷ amount.
                    Leave blank to skip FV adjustment for that asset.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Used to compute Fair Value adjustments in the JE tab.
              {activeCount > 0 && (
                <span className="ml-2">
                  <Badge variant="secondary" className="text-xs">{activeCount} active</Badge>
                </span>
              )}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs shrink-0"
            onClick={handleResetAll}
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset all
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {assets.map((asset) => {
            const raw = localValues[asset] ?? ""
            const num = parseFloat(raw)
            const hasValue = !isNaN(num) && num > 0
            const isRef = REFERENCE_PRICES[asset] != null && num === REFERENCE_PRICES[asset]

            return (
              <div key={asset} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">{asset}</Label>
                  <div className="flex items-center gap-1">
                    {isRef && (
                      <Badge variant="outline" className="text-xs py-0 h-4">ref</Badge>
                    )}
                    {hasValue && !isRef && (
                      <Badge className="text-xs py-0 h-4">custom</Badge>
                    )}
                    {REFERENCE_PRICES[asset] != null && !isRef && (
                      <button
                        onClick={() => handleReset(asset)}
                        className="text-muted-foreground hover:text-foreground"
                        title={`Reset to $${REFERENCE_PRICES[asset]}`}
                      >
                        <RotateCcw className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    className="pl-6 h-8 text-sm"
                    placeholder={REFERENCE_PRICES[asset] != null ? String(REFERENCE_PRICES[asset]) : "0.00"}
                    value={raw}
                    onChange={(e) => handleChange(asset, e.target.value)}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
