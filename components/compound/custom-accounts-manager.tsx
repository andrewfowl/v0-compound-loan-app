"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Plus, Trash2, Edit2, BookOpen, Lock } from "lucide-react"
import type { CustomAccount } from "@/lib/compound/journal-customization"
import { generateId, groupAccountsByType } from "@/lib/compound/journal-customization"

interface CustomAccountsManagerProps {
  accounts: CustomAccount[]
  onChange: (accounts: CustomAccount[]) => void
}

const ACCOUNT_TYPE_CONFIG: Record<CustomAccount["type"], { label: string; color: string; prefix: string }> = {
  asset: { label: "Assets", color: "text-blue-600", prefix: "1" },
  liability: { label: "Liabilities", color: "text-red-600", prefix: "2" },
  equity: { label: "Equity", color: "text-purple-600", prefix: "3" },
  revenue: { label: "Revenue", color: "text-green-600", prefix: "4" },
  expense: { label: "Expenses", color: "text-orange-600", prefix: "5" },
}

const EMPTY_ACCOUNT: Omit<CustomAccount, "id" | "isSystem"> = {
  code: "",
  name: "",
  type: "asset",
  category: "",
  description: "",
}

export function CustomAccountsManager({ accounts, onChange }: CustomAccountsManagerProps) {
  const [isAddingAccount, setIsAddingAccount] = useState(false)
  const [editingAccount, setEditingAccount] = useState<CustomAccount | null>(null)
  const [formData, setFormData] = useState<Omit<CustomAccount, "id" | "isSystem">>(EMPTY_ACCOUNT)

  const groupedAccounts = groupAccountsByType(accounts)

  function handleAdd() {
    if (!formData.code || !formData.name || !formData.type) return

    const newAccount: CustomAccount = {
      id: generateId(),
      ...formData,
      isSystem: false,
    }

    onChange([...accounts, newAccount])
    setFormData(EMPTY_ACCOUNT)
    setIsAddingAccount(false)
  }

  function handleEdit() {
    if (!editingAccount || !formData.code || !formData.name) return

    onChange(
      accounts.map((a) =>
        a.id === editingAccount.id
          ? { ...a, ...formData }
          : a
      )
    )
    setEditingAccount(null)
    setFormData(EMPTY_ACCOUNT)
  }

  function handleDelete(id: string) {
    onChange(accounts.filter((a) => a.id !== id))
  }

  function openEditDialog(account: CustomAccount) {
    setEditingAccount(account)
    setFormData({
      code: account.code,
      name: account.name,
      type: account.type,
      category: account.category,
      description: account.description,
    })
  }

  function getNextCode(type: CustomAccount["type"]): string {
    const prefix = ACCOUNT_TYPE_CONFIG[type].prefix
    const existingCodes = accounts
      .filter((a) => a.type === type)
      .map((a) => parseInt(a.code))
      .filter((n) => !isNaN(n))
    
    if (existingCodes.length === 0) {
      return `${prefix}001`
    }
    
    const maxCode = Math.max(...existingCodes)
    return String(maxCode + 1).padStart(4, "0")
  }

  function handleTypeChange(type: CustomAccount["type"]) {
    setFormData({
      ...formData,
      type,
      code: getNextCode(type),
    })
  }

  const AccountForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Account Type</Label>
          <Select
            value={formData.type}
            onValueChange={(v) => handleTypeChange(v as CustomAccount["type"])}
            disabled={isEdit}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ACCOUNT_TYPE_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  <span className={config.color}>{config.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Account Code</Label>
          <Input
            placeholder="e.g., 1001"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label>Account Name</Label>
        <Input
          placeholder="e.g., Cash & Cash Equivalents"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>
      <div className="grid gap-2">
        <Label>Category</Label>
        <Input
          placeholder="e.g., Current Assets, Protocol Liabilities"
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
        />
      </div>
      <div className="grid gap-2">
        <Label>Description (optional)</Label>
        <Input
          placeholder="Brief description of this account"
          value={formData.description || ""}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>
    </div>
  )

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="size-4" />
              Chart of Accounts
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Manage your accounting structure. System accounts are locked but custom accounts can be added.
            </CardDescription>
          </div>
          <Dialog open={isAddingAccount} onOpenChange={setIsAddingAccount}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1" onClick={() => {
                setFormData({ ...EMPTY_ACCOUNT, code: getNextCode("asset") })
              }}>
                <Plus className="size-3" />
                Add Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Custom Account</DialogTitle>
                <DialogDescription>
                  Create a new account for your chart of accounts.
                </DialogDescription>
              </DialogHeader>
              <AccountForm />
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddingAccount(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAdd}>Add Account</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Dialog */}
          <Dialog open={!!editingAccount} onOpenChange={(open) => !open && setEditingAccount(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Account</DialogTitle>
                <DialogDescription>
                  Update the account details.
                </DialogDescription>
              </DialogHeader>
              <AccountForm isEdit />
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingAccount(null)}>
                  Cancel
                </Button>
                <Button onClick={handleEdit}>Save Changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" defaultValue={Object.keys(ACCOUNT_TYPE_CONFIG)} className="space-y-2">
          {(Object.entries(ACCOUNT_TYPE_CONFIG) as [CustomAccount["type"], typeof ACCOUNT_TYPE_CONFIG["asset"]][]).map(
            ([type, config]) => {
              const typeAccounts = groupedAccounts[type] || []
              const systemCount = typeAccounts.filter((a) => a.isSystem).length
              const customCount = typeAccounts.length - systemCount

              return (
                <AccordionItem key={type} value={type} className="border rounded-lg px-0">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <span className={`font-semibold ${config.color}`}>{config.label}</span>
                      <div className="flex gap-1">
                        <Badge variant="secondary" className="text-xs">
                          {typeAccounts.length} accounts
                        </Badge>
                        {customCount > 0 && (
                          <Badge className="text-xs">
                            {customCount} custom
                          </Badge>
                        )}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-0 pb-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="text-xs">
                          <TableHead className="h-8 w-20">Code</TableHead>
                          <TableHead className="h-8">Name</TableHead>
                          <TableHead className="h-8">Category</TableHead>
                          <TableHead className="h-8 w-20">Type</TableHead>
                          <TableHead className="h-8 w-16"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {typeAccounts.map((account) => (
                          <TableRow key={account.id} className="text-xs">
                            <TableCell className="py-2 font-mono font-medium">
                              {account.code}
                            </TableCell>
                            <TableCell className="py-2">
                              <div className="flex items-center gap-2">
                                {account.name}
                                {account.isSystem && (
                                  <Lock className="size-3 text-muted-foreground" />
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="py-2 text-muted-foreground">
                              {account.category}
                            </TableCell>
                            <TableCell className="py-2">
                              <Badge variant={account.isSystem ? "outline" : "default"} className="text-xs">
                                {account.isSystem ? "system" : "custom"}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-2">
                              {!account.isSystem && (
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-6"
                                    onClick={() => openEditDialog(account)}
                                  >
                                    <Edit2 className="size-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-6"
                                    onClick={() => handleDelete(account.id)}
                                  >
                                    <Trash2 className="size-3 text-destructive" />
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </AccordionContent>
                </AccordionItem>
              )
            }
          )}
        </Accordion>
      </CardContent>
    </Card>
  )
}
