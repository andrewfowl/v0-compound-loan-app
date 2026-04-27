"use client"

import { LottieIcon } from "./lottie-icon"
import type { RiskLevel } from "@/lib/compound/types"

export interface AnimatedStatusBadgeProps {
  status: RiskLevel | "success" | "loading" | "info"
  label?: string
  size?: "sm" | "md" | "lg"
  showIcon?: boolean
}

const STATUS_CONFIG: Record<string, { type: "low" | "monitor" | "at-risk" | "critical" | "success" | "loading" | "info"; color: string; bgColor: string }> = {
  low: { type: "safe", color: "text-green-600 dark:text-green-400", bgColor: "bg-green-100 dark:bg-green-900/30" },
  monitor: { type: "monitor", color: "text-yellow-600 dark:text-yellow-400", bgColor: "bg-yellow-100 dark:bg-yellow-900/30" },
  "at-risk": { type: "at-risk", color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-100 dark:bg-amber-900/30" },
  critical: { type: "liquidation", color: "text-red-600 dark:text-red-400", bgColor: "bg-red-100 dark:bg-red-900/30" },
  success: { type: "success", color: "text-green-600 dark:text-green-400", bgColor: "bg-green-100 dark:bg-green-900/30" },
  loading: { type: "loading", color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  info: { type: "info", color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
}

export function AnimatedStatusBadge({ status, label, size = "md", showIcon = true }: AnimatedStatusBadgeProps) {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]
  if (!config) return null

  const sizeClass = size === "sm" ? "px-2 py-1 text-xs" : size === "lg" ? "px-4 py-2 text-base" : "px-3 py-1.5 text-sm"
  const iconSize = size === "sm" ? "sm" : size === "lg" ? "lg" : "md"

  return (
    <div className={`inline-flex items-center gap-2 rounded-full font-medium ${sizeClass} ${config.bgColor} ${config.color}`}>
      {showIcon && <LottieIcon type={config.type} size={iconSize} loop autoplay speed={1} />}
      <span>{label || status.toUpperCase()}</span>
    </div>
  )
}
