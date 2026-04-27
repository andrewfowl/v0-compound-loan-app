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
    title: "Activity",
    url: "/activity",
    icon: FileText,
    description: "Wallet transaction reports",
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
                  <div className="flex size-8 items-center justify-center rounded bg-sidebar-primary text-sidebar-primary-foreground text-xs font-bold">
                    CLA
                  </div>
                  <div className="grid flex-1 text-left leading-tight">
                    <span className="truncate text-sm font-semibold tracking-tight">CLA Finance</span>
                    <span className="truncate text-xs text-sidebar-foreground/60">Accounting</span>
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
                    <div className="flex size-8 items-center justify-center rounded bg-sidebar-primary text-sidebar-primary-foreground text-xs font-bold">
                      CLA
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">CLA Finance</p>
                      <p className="text-xs text-muted-foreground">Accounting</p>
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
            Workspace
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5 px-2">
              {mainNavItems.map((item) => (
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
