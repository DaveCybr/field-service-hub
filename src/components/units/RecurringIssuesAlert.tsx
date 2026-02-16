import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { formatCurrency } from "@/lib/utils/currency";
import {
  RecurringIssue,
  getSeverityColor,
  getSeverityIcon,
  formatIssueCategoryDisplay,
  calculateMonthsBetween,
  useResolveRecurringIssue,
} from "@/hooks/useUnitInsights";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState } from "react";

interface RecurringIssuesAlertProps {
  issues: RecurringIssue[];
  onIssueResolved?: () => void;
}

export function RecurringIssuesAlert({
  issues,
  onIssueResolved,
}: RecurringIssuesAlertProps) {
  const { resolveIssue, resolving } = useResolveRecurringIssue();
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<RecurringIssue | null>(
    null,
  );
  const [resolveNotes, setResolveNotes] = useState("");

  if (issues.length === 0) {
    return null;
  }

  const handleResolveClick = (issue: RecurringIssue) => {
    setSelectedIssue(issue);
    setResolveNotes("");
    setResolveDialogOpen(true);
  };

  const handleResolveConfirm = async () => {
    if (!selectedIssue) return;

    const result = await resolveIssue(selectedIssue.id, resolveNotes);
    if (result.success) {
      setResolveDialogOpen(false);
      setSelectedIssue(null);
      setResolveNotes("");
      onIssueResolved?.();
    }
  };

  const criticalIssues = issues.filter((i) => i.severity === "critical");
  const highIssues = issues.filter((i) => i.severity === "high");
  const mediumIssues = issues.filter((i) => i.severity === "medium");
  const lowIssues = issues.filter((i) => i.severity === "low");

  const sortedIssues = [
    ...criticalIssues,
    ...highIssues,
    ...mediumIssues,
    ...lowIssues,
  ];

  return (
    <>
      <Card className="border-red-200 bg-red-50/50">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-red-100 p-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <CardTitle className="text-red-900">
                  Recurring Issues Detected
                </CardTitle>
                <p className="text-sm text-red-700 mt-1">
                  {issues.length} pattern{issues.length > 1 ? "s" : ""} of
                  recurring problems found
                </p>
              </div>
            </div>
            {criticalIssues.length > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                {criticalIssues.length} Critical
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {sortedIssues.map((issue, index) => (
            <div key={issue.id}>
              {index > 0 && <Separator className="my-4" />}
              <div className="space-y-3">
                {/* Issue Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">
                        {getSeverityIcon(issue.severity)}
                      </span>
                      <h4 className="font-semibold text-base">
                        {formatIssueCategoryDisplay(issue.issue_category)}
                      </h4>
                      <Badge
                        variant="outline"
                        className={getSeverityColor(issue.severity)}
                      >
                        {issue.severity.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {issue.issue_description}
                    </p>
                  </div>
                </div>

                {/* Issue Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Occurrences
                      </p>
                      <p className="font-semibold">{issue.occurrence_count}x</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Timespan</p>
                      <p className="font-semibold">
                        {calculateMonthsBetween(
                          issue.first_occurrence,
                          issue.last_occurrence,
                        )}{" "}
                        months
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Avg Interval
                      </p>
                      <p className="font-semibold">
                        {issue.avg_interval_days
                          ? `${Math.round(issue.avg_interval_days)} days`
                          : "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Last Occurrence
                      </p>
                      <p className="font-semibold">
                        {formatDistanceToNow(new Date(issue.last_occurrence), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Recommendation */}
                {issue.recommended_action && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                    <p className="text-sm font-medium text-amber-900 mb-1">
                      💡 Recommended Action:
                    </p>
                    <p className="text-sm text-amber-800">
                      {issue.recommended_action}
                    </p>
                    {issue.estimated_fix_cost && (
                      <p className="text-sm text-amber-700 mt-2">
                        Estimated cost:{" "}
                        <span className="font-semibold">
                          {formatCurrency(issue.estimated_fix_cost)}
                        </span>
                      </p>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleResolveClick(issue)}
                  >
                    Mark as Resolved
                  </Button>
                  <Button size="sm" variant="ghost">
                    View Services ({issue.service_ids.length})
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {/* Summary */}
          {issues.length > 1 && (
            <>
              <Separator className="my-4" />
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p className="font-medium mb-1">Summary:</p>
                <p className="text-muted-foreground">
                  This unit has {issues.length} recurring issue patterns.{" "}
                  {criticalIssues.length > 0 && (
                    <span className="text-red-600 font-semibold">
                      {criticalIssues.length} critical issue
                      {criticalIssues.length > 1
                        ? "s require"
                        : " requires"}{" "}
                      immediate attention.
                    </span>
                  )}{" "}
                  Consider comprehensive inspection or replacement if cost of
                  recurring repairs exceeds unit value.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Resolve Dialog */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Issue as Resolved</DialogTitle>
            <DialogDescription>
              Are you sure you want to mark this recurring issue as resolved?
              This will remove it from the active warnings.
            </DialogDescription>
          </DialogHeader>

          {selectedIssue && (
            <div className="space-y-4 py-4">
              <div className="rounded-lg bg-muted p-3">
                <p className="font-medium">
                  {formatIssueCategoryDisplay(selectedIssue.issue_category)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedIssue.issue_description}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Occurred {selectedIssue.occurrence_count} times
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="resolve-notes">
                  Resolution Notes (Optional)
                </Label>
                <Textarea
                  id="resolve-notes"
                  placeholder="e.g., Replaced entire piping system, issue should not recur"
                  value={resolveNotes}
                  onChange={(e) => setResolveNotes(e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Document what action was taken to resolve this issue
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setResolveDialogOpen(false)}
              disabled={resolving}
            >
              Cancel
            </Button>
            <Button onClick={handleResolveConfirm} disabled={resolving}>
              {resolving ? "Resolving..." : "Mark as Resolved"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
