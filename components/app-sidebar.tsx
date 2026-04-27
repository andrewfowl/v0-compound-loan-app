"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  FileText,
  Home,
  Settings,
  HelpCircle,
  Wallet,
  BarChart3,
  History,
  ChevronDown,
  Building2,
  LogOut,
  User,
  Bell,
  CreditCard,
  Shield,
  Plus,
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

const mainNavItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: Home,
    description: "Overview and quick actions",
  },
  {
    title: "Reports",
    url: "/reports",
    icon: FileText,
    badge: 3,
    description: "View and manage reports",
  },
  {
    title: "Wallets",
    url: "/wallets",
    icon: Wallet,
    description: "Connected wallet addresses",
  },
  {
    title: "Analytics",
    url: "/analytics",
    icon: BarChart3,
    description: "Data insights and trends",
  },
  {
    title: "History",
    url: "/history",
    icon: History,
    description: "Activity and audit logs",
  },
]

const settingsNavItems = [
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
  {
    title: "Help Center",
    url: "/help",
    icon: HelpCircle,
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
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="border-b border-sidebar-border/50">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
                    <Building2 className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left leading-tight">
                    <span className="truncate text-sm font-semibold tracking-tight">Compound</span>
                    <span className="truncate text-xs text-muted-foreground">Public Accounting</span>
                  </div>
                  <ChevronDown className="ml-auto size-4 text-muted-foreground" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-64"
                align="start"
                side="bottom"
                sideOffset={4}
              >
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                  Workspaces
                </DropdownMenuLabel>
                <DropdownMenuGroup>
                  <DropdownMenuItem className="gap-3 p-3">
                    <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                      <Building2 className="size-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Compound</p>
                      <p className="text-xs text-muted-foreground">Public Accounting</p>
                    </div>
                    <div className="size-2 rounded-full bg-primary" />
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 text-muted-foreground">
                  <Plus className="size-4" />
                  <span>Add workspace</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup className="py-4">
          <SidebarGroupLabel className="px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
            Main
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    className="h-9 px-3 transition-colors"
                  >
                    <Link href={item.url} className="flex items-center gap-3">
                      <item.icon className="size-4 shrink-0" />
                      <span className="flex-1 truncate text-sm">{item.title}</span>
                      {item.badge && (
                        <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-2xs font-medium text-primary">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="mx-3" />

        <SidebarGroup className="py-4">
          <SidebarGroupLabel className="px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
            Support
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {settingsNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    className="h-9 px-3 transition-colors"
                  >
                    <Link href={item.url} className="flex items-center gap-3">
                      <item.icon className="size-4 shrink-0" />
                      <span className="text-sm">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/50 p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="size-8 rounded-md">
                    <AvatarFallback className="rounded-md bg-gradient-to-br from-primary/80 to-primary text-primary-foreground text-xs font-medium">
                      {userId.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left leading-tight">
                    <span className="truncate text-sm font-medium">{userId}</span>
                    <span className="truncate text-xs text-muted-foreground">Accountant</span>
                  </div>
                  <ChevronDown className="ml-auto size-4 text-muted-foreground" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-64"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-3 px-2 py-3">
                    <Avatar className="size-10 rounded-md">
                      <AvatarFallback className="rounded-md bg-gradient-to-br from-primary/80 to-primary text-primary-foreground font-medium">
                        {userId.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 leading-tight">
                      <span className="font-medium">{userId}</span>
                      <span className="text-xs text-muted-foreground">accountant@company.com</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem className="gap-3 py-2">
                    <User className="size-4 text-muted-foreground" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-3 py-2">
                    <CreditCard className="size-4 text-muted-foreground" />
                    <span>Billing</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-3 py-2">
                    <Bell className="size-4 text-muted-foreground" />
                    <span>Notifications</span>
                    <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-destructive text-2xs font-medium text-destructive-foreground">
                      3
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-3 py-2">
                    <Shield className="size-4 text-muted-foreground" />
                    <span>Security</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="gap-3 py-2 text-muted-foreground"
                  onClick={() => onUserSwitch?.(userId === "user_123" ? "frontend-demo" : "user_123")}
                >
                  <span className="size-4" />
                  <span>Switch to {userId === "user_123" ? "frontend-demo" : "user_123"}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-3 py-2 text-destructive focus:text-destructive">
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
