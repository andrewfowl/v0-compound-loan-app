"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  FileText,
  Home,
  Settings,
  LogOut,
  User,
  ChevronDown,
  TrendingUp,
  Receipt,
  BookOpen,
  Table2,
  DollarSign,
  Wallet,
  Activity,
  Link2,
  ScrollText,
  FileSpreadsheet,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

const workspaceNavItems = [
  {
    title: "Overview",
    url: "/",
    icon: Home,
    description: "Dashboard overview",
  },
  {
    title: "Wallets",
    url: "/activity",
    icon: Wallet,
    description: "Manage wallet addresses",
  },
  {
    title: "Reports",
    url: "/reports",
    icon: FileText,
    description: "Audit report packets",
  },
  {
    title: "Transactions",
    url: "/transactions",
    icon: Receipt,
    description: "Onchain transaction ledger",
  },
  {
    title: "Positions",
    url: "/positions",
    icon: TrendingUp,
    description: "Borrow & supply positions",
  },
  {
    title: "Reconciliation",
    url: "/activity",
    icon: Activity,
    description: "Activity reconciliation",
  },
]

const accountingNavItems = [
  {
    title: "Journal Entries",
    url: "/journal-entries",
    icon: BookOpen,
    description: "JEs and working papers",
  },
  {
    title: "Summary Schedules",
    url: "/schedules",
    icon: Table2,
    description: "Loan & collateral rollforward",
  },
  {
    title: "Fair Value",
    url: "/pricing",
    icon: DollarSign,
    description: "ASC 820 historical pricing",
  },
]

const settingsNavItems = [
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
]

interface AppSidebarProps {
  userId?: string
  onUserSwitch?: (userId: string) => void
}

export function AppSidebar({ userId = "user_123", onUserSwitch }: AppSidebarProps) {
  const pathname = usePathname()

  const isActive = (url: string) => {
    if (url === "/") return pathname === "/"
    return pathname.startsWith(url)
  }

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="border-b border-sidebar-border p-0">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="h-12 px-3 data-[state=open]:bg-sidebar-accent/50"
                >
                  <div className="flex size-8 items-center justify-center rounded bg-sidebar-primary text-sidebar-primary-foreground">
                    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor">
                      <path d="M12 2L4 6v4c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4zm0 2.18l6 3v3.82c0 4.53-3.13 8.77-6 9.82-2.87-1.05-6-5.29-6-9.82V7.18l6-3z"/>
                      <path d="M9 12l2 2 4-4-1.41-1.41L11 11.17l-.59-.59L9 12z"/>
                    </svg>
                  </div>
                  <div className="grid flex-1 text-left leading-tight">
                    <span className="truncate text-sm font-semibold tracking-tight">Compound</span>
                    <span className="truncate text-xs text-sidebar-foreground/60">Loan Accounting</span>
                  </div>
                  <ChevronDown className="size-4 text-sidebar-foreground/40" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64" align="start" side="bottom" sideOffset={4}>
                <DropdownMenuLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2 py-2">
                  Workspaces
                </DropdownMenuLabel>
                <DropdownMenuGroup>
                  <DropdownMenuItem className="gap-3 px-3 py-2.5">
                    <div className="flex size-8 items-center justify-center rounded bg-sidebar-primary text-sidebar-primary-foreground">
                      <svg viewBox="0 0 24 24" className="size-5" fill="currentColor">
                        <path d="M12 2L4 6v4c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4z"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Compound Loan Accounting</p>
                      <p className="text-xs text-muted-foreground">Enterprise DeFi</p>
                    </div>
                    <div className="size-2 rounded-full bg-sidebar-primary/80" />
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-0 py-4">
        <SidebarGroup className="px-0">
          <SidebarGroupLabel className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
            Main
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5 px-2">
              {workspaceNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    className="h-9 px-3 text-sm transition-colors"
                  >
                    <Link href={item.url} className="flex items-center gap-3">
                      <item.icon className="size-4 shrink-0" />
                      <span className="flex-1">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="my-2 mx-3 bg-sidebar-border/40" />

        <SidebarGroup className="px-0">
          <SidebarGroupLabel className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
            Accounting
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5 px-2">
              {accountingNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    className="h-9 px-3 text-sm transition-colors"
                  >
                    <Link href={item.url} className="flex items-center gap-3">
                      <item.icon className="size-4 shrink-0" />
                      <span className="flex-1">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="my-2 mx-3 bg-sidebar-border/40" />

        <SidebarGroup className="px-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5 px-2">
              {settingsNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    className="h-9 px-3 text-sm transition-colors"
                  >
                    <Link href={item.url} className="flex items-center gap-3">
                      <item.icon className="size-4 shrink-0" />
                      <span className="flex-1">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="h-10 data-[state=open]:bg-sidebar-accent/50"
                >
                  <Avatar className="size-8 rounded">
                    <AvatarFallback className="rounded bg-sidebar-primary text-sidebar-primary-foreground text-xs font-semibold">
                      {userId.slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left leading-tight">
                    <span className="truncate text-sm font-medium">{userId.split("_")[1]?.slice(0, 8) || userId.slice(0, 8)}</span>
                    <span className="truncate text-xs text-sidebar-foreground/60">Accountant</span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64" side="top" align="end" sideOffset={4}>
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-3 px-2 py-3">
                    <Avatar className="size-10 rounded">
                      <AvatarFallback className="rounded bg-sidebar-primary text-sidebar-primary-foreground font-semibold">
                        {userId.slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 leading-tight">
                      <span className="font-medium text-sm">{userId}</span>
                      <span className="text-xs text-muted-foreground">accountant@company.com</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem className="gap-3 py-2 text-sm">
                    <User className="size-4 text-muted-foreground" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="gap-3 py-2 text-sm text-muted-foreground"
                    onClick={() => onUserSwitch?.(userId === "user_123" ? "frontend-demo" : "user_123")}
                  >
                    <span className="size-4" />
                    <span>Switch User</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-3 py-2 text-sm text-destructive focus:text-destructive">
                  <LogOut className="size-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
