import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatUsd } from "@/lib/compound/format"

interface SummaryTabProps {
  collateralSummary: Record<string, Record<string, number>>
  debtSummary: Record<string, Record<string, number>>
  collateralTokens: string[]
  debtTokens: string[]
}

export function SummaryTab({ collateralSummary, debtSummary, collateralTokens, debtTokens }: SummaryTabProps) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-center text-lg border-b pb-2">COLLATERAL</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-b-2">
                <TableHead className="font-bold">ACTIVITY</TableHead>
                {collateralTokens.map((token) => (
                  <TableHead key={token} className="text-right font-bold">{token}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(collateralSummary).map(([activity, tokens]) => (
                <TableRow key={activity}>
                  <TableCell className="font-medium">{activity}</TableCell>
                  {collateralTokens.map((token) => (
                    <TableCell key={token} className="text-right font-mono">
                      {formatUsd(tokens[token] ?? 0, activity === "deposited")}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-center text-lg border-b pb-2">DEBT</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-b-2">
                <TableHead className="font-bold">ACTIVITY</TableHead>
                {debtTokens.map((token) => (
                  <TableHead key={token} className="text-right font-bold">{token}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(debtSummary).map(([activity, tokens]) => (
                <TableRow key={activity}>
                  <TableCell className="font-medium">{activity}</TableCell>
                  {debtTokens.map((token) => (
                    <TableCell key={token} className="text-right font-mono">
                      {formatUsd(tokens[token] ?? 0, activity === "Borrow")}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
