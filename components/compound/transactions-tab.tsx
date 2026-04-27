import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { formatAddress, formatDate, formatUsd, formatCrypto } from "@/lib/compound/format"
import type { CompoundEvent } from "@/lib/compound/types"

interface TransactionsTabProps {
  events: CompoundEvent[]
}

export function TransactionsTab({ events }: TransactionsTabProps) {
  return (
    <div className="space-y-4">
      {/* Data Source Indicator */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground border rounded-lg p-2 bg-muted/20">
        <Badge variant="outline" className="text-xs">Data Source</Badge>
        <span>Transformed from <code className="bg-muted px-1 rounded">normalizedEvents</code> via <code className="bg-muted px-1 rounded">transformToCompoundEvents()</code></span>
      </div>
      
    <Card>
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b-2">
                <TableHead className="font-bold">TX HASH</TableHead>
                <TableHead className="font-bold">ACCOUNT</TableHead>
                <TableHead className="font-bold">ACTIVITY</TableHead>
                <TableHead className="font-bold">TIMESTAMP</TableHead>
                <TableHead className="font-bold">EVENT NAME</TableHead>
                <TableHead className="font-bold">TOKEN SYMBOL</TableHead>
                <TableHead className="text-right font-bold">AMOUNT</TableHead>
                <TableHead className="text-right font-bold">AMOUNT USD</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    No Compound activity found for this address
                  </TableCell>
                </TableRow>
              ) : (
                events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-mono text-sm">
                      <a
                        href={`https://etherscan.io/tx/${event.transactionHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        {formatAddress(event.transactionHash)}
                      </a>
                    </TableCell>
                    <TableCell>
                      <span className={event.accountType === "collateral" ? "text-green-600" : "text-amber-600"}>
                        {event.accountType}
                      </span>
                    </TableCell>
                    <TableCell>{event.activity}</TableCell>
                    <TableCell>{formatDate(event.timestamp)}</TableCell>
                    <TableCell className="text-blue-600">{event.eventName}</TableCell>
                    <TableCell className="text-red-600 font-medium">{event.asset}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCrypto(parseFloat(event.amount))}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatUsd(parseFloat(event.amountUsd))}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
    </div>
  )
}
