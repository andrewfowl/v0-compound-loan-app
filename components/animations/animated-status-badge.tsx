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
  low: { type: "safe", color: "text-success", bgColor: "bg-success-muted" },
  monitor: { type: "monitor", color: "text-warning", bgColor: "bg-warning-muted" },
  "at-risk": { type: "at-risk", color: "text-warning", bgColor: "bg-warning-muted" },
  critical: { type: "liquidation", color: "text-destructive", bgColor: "bg-destructive-muted" },
  success: { type: "success", color: "text-success", bgColor: "bg-success-muted" },
  loading: { type: "loading", color: "text-muted-foreground", bgColor: "bg-muted" },
  info: { type: "info", color: "text-muted-foreground", bgColor: "bg-muted" },
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
