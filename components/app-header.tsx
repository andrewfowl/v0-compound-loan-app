"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell, Search, Moon, Sun, Command, Check } from "lucide-react"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const notifications = [
  {
    id: 1,
    title: "Report completed",
    description: "0xd043...565D report for 2024-05 is ready",
    time: "2 min ago",
    unread: true,
    type: "success",
  },
  {
    id: 2,
    title: "Indexing started",
    description: "New indexing job queued for 0x462c...2108",
    time: "15 min ago",
    unread: true,
    type: "info",
  },
  {
    id: 3,
    title: "System update",
    description: "New features available in the reporting module",
    time: "1 hour ago",
    unread: false,
    type: "info",
  },
]

function getBreadcrumbs(pathname: string) {
  const segments = pathname.split("/").filter(Boolean)
  const breadcrumbs: { title: string; href: string }[] = [
    { title: "Dashboard", href: "/" },
  ]

  let currentPath = ""
  for (const segment of segments) {
    currentPath += `/${segment}`
    
    let title = segment
    if (segment === "activity") {
      title = "Activity"
    } else if (segment.startsWith("0x")) {
      title = `${segment.slice(0, 6)}...${segment.slice(-4)}`
    } else if (segment === "reports") {
      title = "Reports"
    } else if (segment === "wallets") {
      title = "Wallets"
    } else if (segment === "analytics") {
      title = "Analytics"
    } else if (segment === "history") {
      title = "History"
    } else if (segment === "settings") {
      title = "Settings"
    } else if (segment === "help") {
      title = "Help Center"
    }

    breadcrumbs.push({ title, href: currentPath })
  }

  return breadcrumbs
}

function getStatusDotClass(type: string) {
  switch (type) {
    case "success":
      return "bg-green-500"
    case "warning":
      return "bg-amber-500"
    case "error":
      return "bg-red-500"
    default:
      return "bg-blue-500"
  }
}

export function AppHeader() {
  const pathname = usePathname()
  const breadcrumbs = getBreadcrumbs(pathname)
  const [theme, setTheme] = React.useState<"light" | "dark">("dark")
  const unreadCount = notifications.filter((n) => n.unread).length

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light"
    setTheme(newTheme)
    document.documentElement.classList.toggle("dark", newTheme === "dark")
  }

  React.useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark") || 
      window.matchMedia("(prefers-color-scheme: dark)").matches
    setTheme(isDark ? "dark" : "light")
    document.documentElement.classList.toggle("dark", isDark)
  }, [])

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border/50 bg-background/80 backdrop-blur-sm px-4">
      <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground" />
      <Separator orientation="vertical" className="h-4" />
      
      <Breadcrumb className="hidden md:flex">
        <BreadcrumbList className="gap-1.5">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={crumb.href}>
              {index > 0 && <BreadcrumbSeparator className="text-muted-foreground/50" />}
              <BreadcrumbItem>
                {index === breadcrumbs.length - 1 ? (
                  <BreadcrumbPage className="font-medium">{crumb.title}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild className="text-muted-foreground hover:text-foreground transition-colors">
                    <Link href={crumb.href}>{crumb.title}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex items-center gap-1">
        {/* Search */}
        <div className="relative hidden lg:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search..."
            className="w-56 pl-9 h-8 text-sm bg-muted/50 border-transparent focus:border-border focus:bg-background transition-colors"
          />
          <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 hidden h-5 select-none items-center gap-0.5 rounded border bg-background px-1.5 font-mono text-2xs text-muted-foreground sm:flex">
            <Command className="size-3" />K
          </kbd>
        </div>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative size-8 text-muted-foreground hover:text-foreground">
              <Bell className="size-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-2xs font-medium text-primary-foreground">
                  {unreadCount}
                </span>
              )}
              <span className="sr-only">Notifications</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between py-3">
              <span className="font-semibold">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  {unreadCount} unread
                </span>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-80 overflow-y-auto">
              {notifications.map((notification) => (
                <DropdownMenuItem key={notification.id} className="flex flex-col items-start gap-1 p-3 cursor-pointer">
                  <div className="flex w-full items-start gap-3">
                    <span className={`mt-1.5 size-2 shrink-0 rounded-full ${getStatusDotClass(notification.type)}`} />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{notification.title}</span>
                        {notification.unread && (
                          <span className="size-1.5 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{notification.description}</p>
                      <p className="text-2xs text-muted-foreground/70">{notification.time}</p>
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="justify-center py-2.5 text-sm text-primary hover:text-primary">
              <Check className="mr-2 size-4" />
              Mark all as read
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme toggle */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="size-8 text-muted-foreground hover:text-foreground" 
          onClick={toggleTheme}
        >
          {theme === "light" ? (
            <Moon className="size-4" />
          ) : (
            <Sun className="size-4" />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </div>
    </header>
  )
}
