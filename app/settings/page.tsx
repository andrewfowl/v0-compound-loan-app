"use client"

import { useState } from "react"
import { AppShell } from "@/components/app-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { User, Bell, Shield, CreditCard, Building2, Key, Eye, EyeOff, Copy, Check } from "lucide-react"

type SettingsTab = "profile" | "notifications" | "security" | "billing" | "workspace"

const tabs = [
  { id: "profile" as const, icon: User, label: "Profile" },
  { id: "notifications" as const, icon: Bell, label: "Notifications" },
  { id: "security" as const, icon: Shield, label: "Security" },
  { id: "billing" as const, icon: CreditCard, label: "Billing" },
  { id: "workspace" as const, icon: Building2, label: "Workspace" },
]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile")
  const [showApiKey, setShowApiKey] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <nav className="space-y-1">
              {tabs.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    activeTab === item.id
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Profile Section */}
            {activeTab === "profile" && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Profile Information</CardTitle>
                    <CardDescription>
                      Update your account information and email preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input id="firstName" placeholder="John" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input id="lastName" placeholder="Doe" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" placeholder="john@company.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company">Company</Label>
                      <Input id="company" placeholder="Acme Inc." />
                    </div>
                    <div className="flex justify-end">
                      <Button>Save Changes</Button>
                    </div>
                  </CardContent>
                </Card>

                {/* API Keys Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">API Configuration</CardTitle>
                    <CardDescription>
                      Your API keys and integration settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Kryptos API</span>
                          <Badge variant="secondary" className="text-xs">Connected</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Used for wallet indexing and report generation
                        </p>
                      </div>
                      <Button variant="outline" size="sm">Configure</Button>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <div className="space-y-1">
                        <span className="text-sm font-medium">Webhook URL</span>
                        <p className="text-xs text-muted-foreground font-mono">
                          {process.env.NEXT_PUBLIC_APP_URL || "https://your-app.vercel.app"}/api/webhooks/kryptos
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleCopy(`${process.env.NEXT_PUBLIC_APP_URL || "https://your-app.vercel.app"}/api/webhooks/kryptos`)}>
                        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Notifications Section */}
            {activeTab === "notifications" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Notification Preferences</CardTitle>
                  <CardDescription>
                    Choose what notifications you want to receive
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Email Notifications</h4>
                    {[
                      { label: "Report completed", description: "Get notified when a report finishes processing", defaultChecked: true },
                      { label: "Weekly summary", description: "Receive a weekly digest of your activity", defaultChecked: true },
                      { label: "System updates", description: "Important updates about the platform", defaultChecked: true },
                      { label: "New features", description: "Be the first to know about new features", defaultChecked: false },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between py-2">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-medium">{item.label}</Label>
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        </div>
                        <Switch defaultChecked={item.defaultChecked} />
                      </div>
                    ))}
                  </div>
                  <Separator />
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">In-App Notifications</h4>
                    {[
                      { label: "Job status updates", description: "Real-time updates on indexing jobs", defaultChecked: true },
                      { label: "Risk alerts", description: "Get alerted when positions reach high risk levels", defaultChecked: true },
                      { label: "Price changes", description: "Significant price movements in your portfolio", defaultChecked: false },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between py-2">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-medium">{item.label}</Label>
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        </div>
                        <Switch defaultChecked={item.defaultChecked} />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end pt-4">
                    <Button>Save Preferences</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Security Section */}
            {activeTab === "security" && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Password</CardTitle>
                    <CardDescription>
                      Change your password to keep your account secure
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <Input id="currentPassword" type="password" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input id="newPassword" type="password" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <Input id="confirmPassword" type="password" />
                    </div>
                    <div className="flex justify-end">
                      <Button>Update Password</Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Two-Factor Authentication</CardTitle>
                    <CardDescription>
                      Add an extra layer of security to your account
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between py-2">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium">Enable 2FA</Label>
                        <p className="text-xs text-muted-foreground">Use an authenticator app for additional security</p>
                      </div>
                      <Switch />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between py-2">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium">Recovery Codes</Label>
                        <p className="text-xs text-muted-foreground">Generate backup codes for account recovery</p>
                      </div>
                      <Button variant="outline" size="sm">Generate</Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">API Keys</CardTitle>
                    <CardDescription>
                      Manage API keys for programmatic access
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-lg border p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Key className="size-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Production API Key</span>
                          <Badge variant="secondary" className="text-xs">Active</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setShowApiKey(!showApiKey)}>
                            {showApiKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleCopy("sk_live_xxxxxxxxxxxxx")}>
                            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                          </Button>
                        </div>
                      </div>
                      <div className="font-mono text-xs text-muted-foreground bg-muted px-3 py-2 rounded">
                        {showApiKey ? "sk_live_a1b2c3d4e5f6g7h8i9j0" : "sk_live_••••••••••••••••••••"}
                      </div>
                      <p className="text-xs text-muted-foreground">Created on Mar 15, 2025. Last used 2 days ago.</p>
                    </div>
                    <div className="flex justify-end">
                      <Button variant="outline">Create New Key</Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Billing Section */}
            {activeTab === "billing" && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Current Plan</CardTitle>
                    <CardDescription>
                      Manage your subscription and billing information
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-semibold">Professional</span>
                          <Badge className="text-xs">Current</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Unlimited wallets, priority indexing, advanced reporting
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">$99</p>
                        <p className="text-xs text-muted-foreground">per month</p>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline">Change Plan</Button>
                      <Button variant="outline" className="text-destructive hover:text-destructive">Cancel</Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Payment Method</CardTitle>
                    <CardDescription>
                      Manage your payment methods
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded bg-muted flex items-center justify-center">
                          <CreditCard className="size-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Visa ending in 4242</p>
                          <p className="text-xs text-muted-foreground">Expires 12/2026</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">Default</Badge>
                    </div>
                    <div className="flex justify-end">
                      <Button variant="outline">Add Payment Method</Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Billing History</CardTitle>
                    <CardDescription>
                      View your past invoices and receipts
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {[
                        { date: "Apr 1, 2025", amount: "$99.00", status: "Paid" },
                        { date: "Mar 1, 2025", amount: "$99.00", status: "Paid" },
                        { date: "Feb 1, 2025", amount: "$99.00", status: "Paid" },
                      ].map((invoice, i) => (
                        <div key={i} className="flex items-center justify-between py-3 border-b last:border-0">
                          <div className="flex items-center gap-4">
                            <span className="text-sm">{invoice.date}</span>
                            <span className="text-sm font-medium">{invoice.amount}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary" className="text-xs">{invoice.status}</Badge>
                            <Button variant="ghost" size="sm">Download</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Workspace Section */}
            {activeTab === "workspace" && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Workspace Settings</CardTitle>
                    <CardDescription>
                      Manage your workspace name and preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="workspaceName">Workspace Name</Label>
                      <Input id="workspaceName" defaultValue="CLA Finance" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="workspaceSlug">Workspace URL</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">compound-accounting.app/</span>
                        <Input id="workspaceSlug" defaultValue="cla-finance" className="max-w-[200px]" />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button>Save Changes</Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Team Members</CardTitle>
                    <CardDescription>
                      Manage who has access to this workspace
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      { name: "John Doe", email: "john@company.com", role: "Owner" },
                      { name: "Jane Smith", email: "jane@company.com", role: "Admin" },
                      { name: "Bob Wilson", email: "bob@company.com", role: "Member" },
                    ].map((member, i) => (
                      <div key={i} className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                            {member.name.split(" ").map(n => n[0]).join("")}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{member.name}</p>
                            <p className="text-xs text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs">{member.role}</Badge>
                      </div>
                    ))}
                    <Separator />
                    <div className="flex justify-end">
                      <Button variant="outline">Invite Member</Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-destructive/50">
                  <CardHeader>
                    <CardTitle className="text-lg text-destructive">Danger Zone</CardTitle>
                    <CardDescription>
                      Irreversible actions for your workspace
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">Delete Workspace</p>
                        <p className="text-xs text-muted-foreground">Permanently delete this workspace and all its data</p>
                      </div>
                      <Button variant="destructive" size="sm">Delete</Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
