import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Package,
  Calendar,
  DollarSign,
  Wrench,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils/currency";
import { PartUsage } from "@/hooks/useUnitInsights";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface PartsHistoryTimelineProps {
  parts: PartUsage[];
  totalCost: number;
  mostReplacedPart: {
    name: string;
    count: number;
    totalCost: number;
  } | null;
}

export function PartsHistoryTimeline({
  parts,
  totalCost,
  mostReplacedPart,
}: PartsHistoryTimelineProps) {
  const [showAll, setShowAll] = useState(false);
  const displayParts = showAll ? parts : parts.slice(0, 10);

  if (parts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-5 w-5" />
            Parts Replacement History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Package className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              No parts replacement history yet
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getReasonColor = (reason: string) => {
    const colors: Record<string, string> = {
      replacement: "bg-red-100 text-red-800",
      maintenance: "bg-blue-100 text-blue-800",
      upgrade: "bg-green-100 text-green-800",
      repair: "bg-yellow-100 text-yellow-800",
    };
    return colors[reason] || "bg-gray-100 text-gray-800";
  };

  const getReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
      replacement: "Replacement",
      maintenance: "Maintenance",
      upgrade: "Upgrade",
      repair: "Repair",
    };
    return labels[reason] || reason;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-5 w-5" />
            Parts Replacement History
          </CardTitle>
          <Badge variant="secondary">{parts.length} parts used</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg bg-muted p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Total Parts Investment
              </p>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totalCost)}</p>
          </div>

          {mostReplacedPart && (
            <div className="rounded-lg bg-muted p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Most Replaced Part
                </p>
              </div>
              <p className="font-semibold">{mostReplacedPart.name}</p>
              <p className="text-sm text-muted-foreground">
                {mostReplacedPart.count}x •{" "}
                {formatCurrency(mostReplacedPart.totalCost)}
              </p>
            </div>
          )}
        </div>

        <Separator />

        {/* Timeline */}
        <div className="space-y-1">
          <h4 className="font-medium text-sm mb-4">Replacement Timeline</h4>

          <div className="space-y-4">
            {displayParts.map((part, index) => (
              <div key={part.id} className="flex gap-4">
                {/* Timeline Indicator */}
                <div className="flex flex-col items-center">
                  <div className="h-3 w-3 rounded-full bg-primary border-2 border-background shadow-sm" />
                  {index < displayParts.length - 1 && (
                    <div className="h-full w-0.5 bg-muted mt-1" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 pb-6">
                  <div className="rounded-lg border bg-card p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Wrench className="h-4 w-4 text-muted-foreground" />
                          <h5 className="font-semibold">{part.product_name}</h5>
                        </div>
                        {part.product_sku && (
                          <p className="text-xs text-muted-foreground font-mono">
                            SKU: {part.product_sku}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className={getReasonColor(part.reason)}
                      >
                        {getReasonLabel(part.reason)}
                      </Badge>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Date</p>
                        <p className="font-medium">
                          {format(new Date(part.created_at), "MMM d, yyyy")}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">
                          Quantity
                        </p>
                        <p className="font-medium">{part.quantity_used}x</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">
                          Unit Price
                        </p>
                        <p className="font-medium">
                          {formatCurrency(part.unit_price)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">
                          Total Cost
                        </p>
                        <p className="font-bold text-primary">
                          {formatCurrency(part.total_cost)}
                        </p>
                      </div>
                    </div>

                    {/* Service Info */}
                    {part.service && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>Service: {part.service.title}</span>
                        <span>•</span>
                        <span className="font-mono">
                          {part.service.invoice.invoice_number}
                        </span>
                      </div>
                    )}

                    {/* Condition & Notes */}
                    {(part.condition_before || part.notes) && (
                      <div className="space-y-2 pt-2 border-t">
                        {part.condition_before && (
                          <div className="flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Condition Before:
                              </p>
                              <p className="text-sm">{part.condition_before}</p>
                            </div>
                          </div>
                        )}
                        {part.notes && (
                          <div className="text-sm">
                            <p className="text-xs text-muted-foreground mb-1">
                              Notes:
                            </p>
                            <p className="text-sm">{part.notes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Show More Button */}
          {parts.length > 10 && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAll(!showAll)}
              >
                {showAll ? "Show Less" : `Show ${parts.length - 10} More Parts`}
              </Button>
            </div>
          )}
        </div>

        {/* Bottom Summary */}
        {parts.length > 5 && (
          <>
            <Separator />
            <div className="rounded-lg bg-muted p-3 text-sm">
              <p className="font-medium mb-1">Parts Analysis:</p>
              <p className="text-muted-foreground">
                A total of {parts.length} parts have been replaced on this unit,
                with a cumulative cost of{" "}
                <span className="font-semibold text-foreground">
                  {formatCurrency(totalCost)}
                </span>
                .{" "}
                {mostReplacedPart && (
                  <>
                    The most frequently replaced part is{" "}
                    <span className="font-semibold text-foreground">
                      {mostReplacedPart.name}
                    </span>{" "}
                    ({mostReplacedPart.count} replacements).
                  </>
                )}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
