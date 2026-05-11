"use client"

import { LottieIcon } from "./lottie-icon"

export interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg"
  text?: string
  fullscreen?: boolean
}

export function LoadingSpinner({ size = "md", text, fullscreen = false }: LoadingSpinnerProps) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-3">
      <LottieIcon type="loading" size={size} loop autoplay speed={1} />
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
    </div>
  )

  if (fullscreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-50">
        {content}
      </div>
    )
  }

  return content
}
