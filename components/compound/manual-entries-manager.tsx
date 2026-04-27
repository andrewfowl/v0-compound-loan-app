"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
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
import { Plus, Trash2, Edit2, FileEdit, DollarSign } from "lucide-react"
import type { CustomAccount, ManualJournalEntry } from "@/lib/compound/journal-customization"
import { generateId, groupAccountsByType } from "@/lib/compound/journal-customization"
import { formatUsd } from "@/lib/compound/format"

interface ManualEntriesManagerProps {
  entries: ManualJournalEntry[]
  accounts: CustomAccount[]
  assets: string[]
  onChange: (entries: ManualJournalEntry[]) => void
}

const EMPTY_ENTRY: Omit<ManualJournalEntry, "id" | "createdAt" | "updatedAt"> = {
  date: new Date().toISOString().split("T")[0],
  description: "",
  debitAccountId: "",
  creditAccountId: "",
  amount: 0,
  asset: "",
  memo: "",
  linkedTxHash: "",
}

export function ManualEntriesManager({
  entries,
  accounts,
  assets,
  onChange,
}: ManualEntriesManagerProps) {
  const [isAddingEntry, setIsAddingEntry] = useState(false)
  const [editingEntry, setEditingEntry] = useState<ManualJournalEntry | null>(null)
  const [formData, setFormData] = useState<Omit<ManualJournalEntry, "id" | "createdAt" | "updatedAt">>(EMPTY_ENTRY)

  const groupedAccounts = groupAccountsByType(accounts)

  function getAccountName(id: string): string {
    return accounts.find((a) => a.id === id)?.name || id
  }

  function handleAdd() {
    if (!formData.description || !formData.debitAccountId || !formData.creditAccountId || formData.amount <= 0) {
      return
    }

    const now = new Date().toISOString()
    const newEntry: ManualJournalEntry = {
      id: generateId(),
      ...formData,
      createdAt: now,
      updatedAt: now,
    }

    onChange([...entries, newEntry])
    setFormData(EMPTY_ENTRY)
    setIsAddingEntry(false)
  }

  function handleEdit() {
    if (!editingEntry) return

    onChange(
      entries.map((e) =>
        e.id === editingEntry.id
          ? { ...e, ...formData, updatedAt: new Date().toISOString() }
          : e
      )
    )
    setEditingEntry(null)
    setFormData(EMPTY_ENTRY)
  }

  function handleDelete(id: string) {
    onChange(entries.filter((e) => e.id !== id))
  }

  function openEditDialog(entry: ManualJournalEntry) {
    setEditingEntry(entry)
    setFormData({
      date: entry.date,
      description: entry.description,
      debitAccountId: entry.debitAccountId,
      creditAccountId: entry.creditAccountId,
      amount: entry.amount,
      asset: entry.asset,
      memo: entry.memo,
      linkedTxHash: entry.linkedTxHash,
    })
  }

  const AccountSelect = ({
    value,
    onChange: onSelectChange,
    label,
  }: {
    value: string
    onChange: (v: string) => void
    label: string
  }) => (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onSelectChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select account" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(groupedAccounts).map(([type, accts]) => (
            <div key={type}>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase">
                {type}
              </div>
              {accts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  <span className="font-mono text-xs mr-2">{account.code}</span>
                  {account.name}
                </SelectItem>
              ))}
            </div>
          ))}
        </SelectContent>
      </Select>
    </div>
  )

  const EntryForm = () => (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Date</Label>
          <Input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          />
        </div>
        <div className="grid gap-2">
          <Label>Asset (optional)</Label>
          <Select
            value={formData.asset || "_none"}
            onValueChange={(v) => setFormData({ ...formData, asset: v === "_none" ? "" : v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select asset" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">None</SelectItem>
              {assets.map((asset) => (
                <SelectItem key={asset} value={asset}>
                  {asset}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid gap-2">
        <Label>Description</Label>
        <Input
          placeholder="e.g., Adjust FV for WETH position"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <AccountSelect
          label="Debit Account"
          value={formData.debitAccountId}
          onChange={(v) => setFormData({ ...formData, debitAccountId: v })}
        />
        <AccountSelect
          label="Credit Account"
          value={formData.creditAccountId}
          onChange={(v) => setFormData({ ...formData, creditAccountId: v })}
        />
      </div>

      <div className="grid gap-2">
        <Label>Amount (USD)</Label>
        <div className="relative">
          <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="number"
            min="0"
            step="any"
            className="pl-8"
            placeholder="0.00"
            value={formData.amount || ""}
            onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label>Memo (optional)</Label>
        <Textarea
          placeholder="Additional notes or justification..."
          value={formData.memo || ""}
          onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
          rows={2}
        />
      </div>

      <div className="grid gap-2">
        <Label>Linked Transaction Hash (optional)</Label>
        <Input
          placeholder="0x..."
          className="font-mono text-xs"
          value={formData.linkedTxHash || ""}
          onChange={(e) => setFormData({ ...formData, linkedTxHash: e.target.value })}
        />
      </div>
    </div>
  )

  const sortedEntries = [...entries].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <FileEdit className="size-4" />
              Manual Journal Entries
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Add custom entries to supplement on-chain data. These entries will be included in the JE report.
            </CardDescription>
          </div>
          <Dialog open={isAddingEntry} onOpenChange={setIsAddingEntry}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1" onClick={() => setFormData(EMPTY_ENTRY)}>
                <Plus className="size-3" />
                Add Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Manual Journal Entry</DialogTitle>
                <DialogDescription>
                  Create a custom journal entry with double-entry bookkeeping.
                </DialogDescription>
              </DialogHeader>
              <EntryForm />
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddingEntry(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAdd}>Add Entry</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Dialog */}
          <Dialog open={!!editingEntry} onOpenChange={(open) => !open && setEditingEntry(null)}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Edit Journal Entry</DialogTitle>
                <DialogDescription>
                  Update this manual journal entry.
                </DialogDescription>
              </DialogHeader>
              <EntryForm />
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingEntry(null)}>
                  Cancel
                </Button>
                <Button onClick={handleEdit}>Save Changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {sortedEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileEdit className="size-10 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">No manual entries yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add entries to supplement on-chain transactions
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="text-xs">
                <TableHead className="h-8">Date</TableHead>
                <TableHead className="h-8">Description</TableHead>
                <TableHead className="h-8">Debit</TableHead>
                <TableHead className="h-8">Credit</TableHead>
                <TableHead className="h-8 text-right">Amount</TableHead>
                <TableHead className="h-8 w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedEntries.map((entry) => (
                <TableRow key={entry.id} className="text-xs">
                  <TableCell className="py-2 font-mono">
                    {entry.date}
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex items-center gap-2">
                      {entry.description}
                      {entry.asset && (
                        <Badge variant="outline" className="text-xs">
                          {entry.asset}
                        </Badge>
                      )}
                    </div>
                    {entry.memo && (
                      <p className="text-muted-foreground mt-0.5 text-[10px]">
                        {entry.memo}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="py-2 text-blue-600">
                    {getAccountName(entry.debitAccountId)}
                  </TableCell>
                  <TableCell className="py-2 text-amber-600">
                    {getAccountName(entry.creditAccountId)}
                  </TableCell>
                  <TableCell className="py-2 text-right font-mono font-medium">
                    {formatUsd(entry.amount)}
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        onClick={() => openEditDialog(entry)}
                      >
                        <Edit2 className="size-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        onClick={() => handleDelete(entry.id)}
                      >
                        <Trash2 className="size-3 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
