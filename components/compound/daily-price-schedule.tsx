"use client"

import { useState, useMemo } from "react"
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Trash2, Calendar, DollarSign, Upload, Info, ChevronDown, ChevronRight } from "lucide-react"
import type { PriceSchedule, DailyPrice } from "@/lib/compound/journal-customization"

interface DailyPriceScheduleProps {
  assets: string[]
  schedule: PriceSchedule
  onChange: (schedule: PriceSchedule) => void
  /** Date range from the report */
  startDate?: string
  endDate?: string
}

export function DailyPriceSchedule({
  assets,
  schedule,
  onChange,
  startDate,
  endDate,
}: DailyPriceScheduleProps) {
  const [selectedAsset, setSelectedAsset] = useState<string>(assets[0] || "")
  const [isAddingEntry, setIsAddingEntry] = useState(false)
  const [newEntry, setNewEntry] = useState({ date: "", price: "" })
  const [expandedAssets, setExpandedAssets] = useState<Set<string>>(new Set(assets))

  // Group entries by asset
  const entriesByAsset = useMemo(() => {
    const grouped: Record<string, DailyPrice[]> = {}
    for (const asset of assets) {
      grouped[asset] = schedule.entries
        .filter((e) => e.asset === asset)
        .sort((a, b) => a.date.localeCompare(b.date))
    }
    return grouped
  }, [assets, schedule.entries])

  function handleAddEntry() {
    if (!selectedAsset || !newEntry.date || !newEntry.price) return
    
    const price = parseFloat(newEntry.price)
    if (isNaN(price) || price <= 0) return

    // Remove existing entry for same date/asset
    const filtered = schedule.entries.filter(
      (e) => !(e.asset === selectedAsset && e.date === newEntry.date)
    )

    onChange({
      ...schedule,
      entries: [
        ...filtered,
        {
          date: newEntry.date,
          asset: selectedAsset,
          price,
          source: "manual",
        },
      ],
    })

    setNewEntry({ date: "", price: "" })
    setIsAddingEntry(false)
  }

  function handleDeleteEntry(asset: string, date: string) {
    onChange({
      ...schedule,
      entries: schedule.entries.filter(
        (e) => !(e.asset === asset && e.date === date)
      ),
    })
  }

  function handleDefaultChange(asset: string, value: string) {
    const price = parseFloat(value)
    const newDefaults = { ...schedule.defaults }
    
    if (!isNaN(price) && price > 0) {
      newDefaults[asset] = price
    } else {
      delete newDefaults[asset]
    }
    
    onChange({ ...schedule, defaults: newDefaults })
  }

  function toggleAssetExpanded(asset: string) {
    const next = new Set(expandedAssets)
    if (next.has(asset)) {
      next.delete(asset)
    } else {
      next.add(asset)
    }
    setExpandedAssets(next)
  }

  // Generate date range for quick-fill
  const dateRange = useMemo(() => {
    if (!startDate || !endDate) return []
    const dates: string[] = []
    const current = new Date(startDate)
    const end = new Date(endDate)
    while (current <= end) {
      dates.push(current.toISOString().split("T")[0])
      current.setDate(current.getDate() + 1)
    }
    return dates
  }, [startDate, endDate])

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="size-4" />
              Daily Price Schedule
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Set per-day prices for accurate Fair Value calculations. Prices are used to compute MTM adjustments.
            </CardDescription>
          </div>
          <Dialog open={isAddingEntry} onOpenChange={setIsAddingEntry}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <Plus className="size-3" />
                Add Price
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Daily Price</DialogTitle>
                <DialogDescription>
                  Enter a price for a specific asset and date.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Asset</Label>
                  <Select value={selectedAsset} onValueChange={setSelectedAsset}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select asset" />
                    </SelectTrigger>
                    <SelectContent>
                      {assets.map((asset) => (
                        <SelectItem key={asset} value={asset}>
                          {asset}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={newEntry.date}
                    onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                    min={startDate}
                    max={endDate}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Price (USD)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      className="pl-8"
                      placeholder="0.00"
                      value={newEntry.price}
                      onChange={(e) => setNewEntry({ ...newEntry, price: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddingEntry(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddEntry}>Add Price</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Default Prices */}
        <div className="p-3 rounded-lg bg-muted/30 border">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-medium">Default Prices</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="size-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs">
                  Default prices are used when no date-specific price is set.
                  They serve as the baseline for Fair Value calculations.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {assets.map((asset) => (
              <div key={asset} className="space-y-1">
                <Label className="text-xs">{asset}</Label>
                <div className="relative">
                  <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    className="pl-6 h-8 text-sm"
                    placeholder="0.00"
                    value={schedule.defaults[asset] ?? ""}
                    onChange={(e) => handleDefaultChange(asset, e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Price Entries by Asset */}
        <div className="space-y-2">
          {assets.map((asset) => {
            const entries = entriesByAsset[asset] || []
            const isExpanded = expandedAssets.has(asset)
            
            return (
              <div key={asset} className="border rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleAssetExpanded(asset)}
                  className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown className="size-4" />
                    ) : (
                      <ChevronRight className="size-4" />
                    )}
                    <span className="font-medium text-sm">{asset}</span>
                    <Badge variant="secondary" className="text-xs">
                      {entries.length} {entries.length === 1 ? "price" : "prices"}
                    </Badge>
                  </div>
                  {schedule.defaults[asset] && (
                    <span className="text-xs text-muted-foreground">
                      Default: ${schedule.defaults[asset].toLocaleString()}
                    </span>
                  )}
                </button>
                
                {isExpanded && entries.length > 0 && (
                  <div className="border-t">
                    <Table>
                      <TableHeader>
                        <TableRow className="text-xs">
                          <TableHead className="h-8">Date</TableHead>
                          <TableHead className="h-8">Price</TableHead>
                          <TableHead className="h-8">Source</TableHead>
                          <TableHead className="h-8 w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {entries.map((entry) => (
                          <TableRow key={`${entry.asset}-${entry.date}`} className="text-xs">
                            <TableCell className="py-2 font-mono">
                              {entry.date}
                            </TableCell>
                            <TableCell className="py-2">
                              ${entry.price.toLocaleString()}
                            </TableCell>
                            <TableCell className="py-2">
                              <Badge variant="outline" className="text-xs capitalize">
                                {entry.source}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-6"
                                onClick={() => handleDeleteEntry(entry.asset, entry.date)}
                              >
                                <Trash2 className="size-3 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                
                {isExpanded && entries.length === 0 && (
                  <div className="p-4 text-center text-xs text-muted-foreground border-t">
                    No date-specific prices. Using default price if set.
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Import Option */}
        <div className="flex items-center justify-center p-3 border border-dashed rounded-lg">
          <Button variant="ghost" size="sm" className="gap-2 text-xs text-muted-foreground">
            <Upload className="size-3" />
            Import prices from CSV (coming soon)
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
