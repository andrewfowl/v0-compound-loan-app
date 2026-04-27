"use client"

import * as React from "react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { AppHeader } from "@/components/app-header"
import { ErrorBoundary } from "@/components/error-boundary"

const USER_PREFS_KEY = "compound-reporting-user-prefs"

function loadUserIdFromStorage(): string {
  if (typeof window === "undefined") return "user_123"
  try {
    const stored = localStorage.getItem(USER_PREFS_KEY)
    const prefs = stored ? JSON.parse(stored) : {}
    return prefs.userId || "user_123"
  } catch {
    return "user_123"
  }
}

function saveUserIdToStorage(userId: string) {
  if (typeof window === "undefined") return
  try {
    const stored = localStorage.getItem(USER_PREFS_KEY)
    const prefs = stored ? JSON.parse(stored) : {}
    localStorage.setItem(USER_PREFS_KEY, JSON.stringify({ ...prefs, userId }))
  } catch {
    // silently fail
  }
}

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const [userId, setUserId] = React.useState("user_123")

  React.useEffect(() => {
    setUserId(loadUserIdFromStorage())
  }, [])

  const handleUserSwitch = (newUserId: string) => {
    setUserId(newUserId)
    saveUserIdToStorage(newUserId)
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar userId={userId} onUserSwitch={handleUserSwitch} />
        <SidebarInset className="flex flex-1 flex-col">
          <AppHeader />
          <main className="flex-1 overflow-auto bg-background">
            <div className="mx-auto w-full max-w-full p-6">
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
