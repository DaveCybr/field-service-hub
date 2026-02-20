// TaskChecklist - Stub implementation (service_tasks table not yet created)
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, CheckCircle2 } from "lucide-react";

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

export function TaskChecklist({ serviceId, disabled = false }: TaskChecklistProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;
    const newTask: Task = {
      id: crypto.randomUUID(),
      title: newTaskTitle.trim(),
      description: null,
      completed: false,
      completed_at: null,
      order_index: tasks.length,
    };
    setTasks([...tasks, newTask]);
    setNewTaskTitle("");
  };

  const handleToggleTask = (taskId: string) => {
    if (disabled) return;
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, completed: !t.completed, completed_at: !t.completed ? new Date().toISOString() : null } : t
    ));
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-4">
      {tasks.length > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progres</span>
            <span className="font-medium">{completedCount}/{totalCount} ({completionPercentage}%)</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${completionPercentage}%` }} />
          </div>
        </div>
      )}

      {!disabled && (
        <div className="flex gap-2">
          <Input
            placeholder="Tambah tugas baru..."
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleAddTask()}
          />
          <Button onClick={handleAddTask} disabled={!newTaskTitle.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Belum ada tugas dalam checklist</p>
          {!disabled && <p className="text-xs">Tambahkan tugas untuk melacak pekerjaan Anda</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
              <Checkbox
                checked={task.completed}
                onCheckedChange={() => handleToggleTask(task.id)}
                disabled={disabled}
                className="mt-1"
              />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${task.completed ? "line-through text-muted-foreground" : ""}`}>
                  {task.title}
                </p>
                {task.completed && task.completed_at && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Selesai pada {new Date(task.completed_at).toLocaleTimeString("id-ID")}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
