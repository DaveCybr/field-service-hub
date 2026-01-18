import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Loader2, CheckCircle2 } from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  completed_at: string | null;
  order_index: number;
}

interface TaskChecklistProps {
  serviceId: string;
  disabled?: boolean;
}

export function TaskChecklist({
  serviceId,
  disabled = false,
}: TaskChecklistProps) {
  const { employee } = useAuth();
  const { toast } = useToast();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [addingTask, setAddingTask] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    loadTasks();
  }, [serviceId]);

  const loadTasks = async () => {
    try {
      const { data, error } = await supabase
        .from("service_tasks")
        .select("*")
        .eq("service_id", serviceId)
        .order("order_index", { ascending: true });

      if (error) throw error;

      setTasks(data || []);
    } catch (error: any) {
      console.error("Error loading tasks:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load tasks",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Task title is required",
      });
      return;
    }

    try {
      setAddingTask(true);

      const { error } = await supabase.from("service_tasks").insert({
        service_id: serviceId,
        title: newTaskTitle.trim(),
        order_index: tasks.length,
        completed: false,
      });

      if (error) throw error;

      setNewTaskTitle("");
      await loadTasks();

      toast({
        title: "Task Added",
        description: "New task added to checklist",
      });
    } catch (error: any) {
      console.error("Error adding task:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add task",
      });
    } finally {
      setAddingTask(false);
    }
  };

  const handleToggleTask = async (
    taskId: string,
    currentCompleted: boolean
  ) => {
    if (disabled) return;

    try {
      const { error } = await supabase
        .from("service_tasks")
        .update({
          completed: !currentCompleted,
          completed_at: !currentCompleted ? new Date().toISOString() : null,
          completed_by: !currentCompleted ? employee?.id : null,
        })
        .eq("id", taskId);

      if (error) throw error;

      // Update local state
      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId
            ? {
                ...task,
                completed: !currentCompleted,
                completed_at: !currentCompleted
                  ? new Date().toISOString()
                  : null,
              }
            : task
        )
      );

      toast({
        title: !currentCompleted ? "Task Completed" : "Task Unchecked",
        description: !currentCompleted
          ? "Task marked as complete"
          : "Task marked as incomplete",
      });
    } catch (error: any) {
      console.error("Error toggling task:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update task",
      });
    }
  };

  const handleDeleteTask = async () => {
    if (!deletingTaskId) return;

    try {
      const { error } = await supabase
        .from("service_tasks")
        .delete()
        .eq("id", deletingTaskId);

      if (error) throw error;

      setTasks((prev) => prev.filter((task) => task.id !== deletingTaskId));
      setShowDeleteDialog(false);
      setDeletingTaskId(null);

      toast({
        title: "Task Deleted",
        description: "Task removed from checklist",
      });
    } catch (error: any) {
      console.error("Error deleting task:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete task",
      });
    }
  };

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;
  const completionPercentage =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      {tasks.length > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              {completedCount}/{totalCount} ({completionPercentage}%)
            </span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Add Task */}
      {!disabled && (
        <div className="flex gap-2">
          <Input
            placeholder="Add new task..."
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleAddTask()}
            disabled={addingTask}
          />
          <Button
            onClick={handleAddTask}
            disabled={addingTask || !newTaskTitle.trim()}
          >
            {addingTask ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}

      {/* Tasks List */}
      {tasks.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No tasks in checklist</p>
          {!disabled && <p className="text-xs">Add tasks to track your work</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <Checkbox
                checked={task.completed}
                onCheckedChange={() =>
                  handleToggleTask(task.id, task.completed)
                }
                disabled={disabled}
                className="mt-1"
              />

              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium ${
                    task.completed ? "line-through text-muted-foreground" : ""
                  }`}
                >
                  {task.title}
                </p>
                {task.description && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {task.description}
                  </p>
                )}
                {task.completed && task.completed_at && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Completed at{" "}
                    {new Date(task.completed_at).toLocaleTimeString()}
                  </p>
                )}
              </div>

              {!disabled && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setDeletingTaskId(task.id);
                    setShowDeleteDialog(true);
                  }}
                  className="flex-shrink-0"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this task? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowDeleteDialog(false);
                setDeletingTaskId(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTask}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
