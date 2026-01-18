import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, X, Wrench } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Skill {
  id: string;
  skill_name: string;
  proficiency_level: string;
}

interface SkillsManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  technicianId: string;
  technicianName: string;
  onSkillsUpdated: () => void;
}

const PROFICIENCY_LEVELS = [
  { value: 'beginner', label: 'Beginner', color: 'bg-slate-100 text-slate-800' },
  { value: 'intermediate', label: 'Intermediate', color: 'bg-blue-100 text-blue-800' },
  { value: 'advanced', label: 'Advanced', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'expert', label: 'Expert', color: 'bg-purple-100 text-purple-800' },
];

const COMMON_SKILLS = [
  'AC Installation',
  'AC Maintenance',
  'AC Repair',
  'Refrigerator Repair',
  'Washing Machine Repair',
  'Electrical Wiring',
  'Compressor Replacement',
  'Gas Refill',
  'PCB Repair',
  'Water Heater',
  'Duct Cleaning',
  'Thermostat Installation',
];

export default function SkillsManagementDialog({
  open,
  onOpenChange,
  technicianId,
  technicianName,
  onSkillsUpdated,
}: SkillsManagementDialogProps) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [newProficiency, setNewProficiency] = useState('intermediate');
  const { toast } = useToast();

  useEffect(() => {
    if (open && technicianId) {
      fetchSkills();
    }
  }, [open, technicianId]);

  const fetchSkills = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('technician_skills')
        .select('*')
        .eq('technician_id', technicianId)
        .order('skill_name');

      if (error) throw error;
      setSkills(data || []);
    } catch (error) {
      console.error('Error fetching skills:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load skills.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddSkill = async () => {
    if (!newSkill.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please enter a skill name.',
      });
      return;
    }

    // Check for duplicate
    if (skills.some(s => s.skill_name.toLowerCase() === newSkill.toLowerCase())) {
      toast({
        variant: 'destructive',
        title: 'Duplicate Skill',
        description: 'This skill already exists for this technician.',
      });
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('technician_skills')
        .insert([{
          technician_id: technicianId,
          skill_name: newSkill.trim(),
          proficiency_level: newProficiency,
        }])
        .select()
        .single();

      if (error) throw error;

      setSkills([...skills, data]);
      setNewSkill('');
      setNewProficiency('intermediate');
      onSkillsUpdated();
      
      toast({
        title: 'Skill Added',
        description: `${newSkill} has been added.`,
      });
    } catch (error: any) {
      console.error('Error adding skill:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to add skill.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateProficiency = async (skillId: string, newLevel: string) => {
    try {
      const { error } = await supabase
        .from('technician_skills')
        .update({ proficiency_level: newLevel })
        .eq('id', skillId);

      if (error) throw error;

      setSkills(skills.map(s => 
        s.id === skillId ? { ...s, proficiency_level: newLevel } : s
      ));
      onSkillsUpdated();

      toast({
        title: 'Proficiency Updated',
        description: 'Skill proficiency has been updated.',
      });
    } catch (error: any) {
      console.error('Error updating proficiency:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update proficiency.',
      });
    }
  };

  const handleRemoveSkill = async (skillId: string, skillName: string) => {
    try {
      const { error } = await supabase
        .from('technician_skills')
        .delete()
        .eq('id', skillId);

      if (error) throw error;

      setSkills(skills.filter(s => s.id !== skillId));
      onSkillsUpdated();

      toast({
        title: 'Skill Removed',
        description: `${skillName} has been removed.`,
      });
    } catch (error: any) {
      console.error('Error removing skill:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to remove skill.',
      });
    }
  };

  const getProficiencyBadge = (level: string) => {
    const config = PROFICIENCY_LEVELS.find(p => p.value === level) || PROFICIENCY_LEVELS[1];
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const availableCommonSkills = COMMON_SKILLS.filter(
    skill => !skills.some(s => s.skill_name.toLowerCase() === skill.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Manage Skills - {technicianName}
          </DialogTitle>
          <DialogDescription>
            Add, edit, or remove skills for this technician. Set proficiency levels for each skill.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Add New Skill */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Add New Skill</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter skill name..."
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  className="flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
                />
                <Select value={newProficiency} onValueChange={setNewProficiency}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROFICIENCY_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleAddSkill} disabled={saving}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Quick Add Common Skills */}
            {availableCommonSkills.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Quick Add</Label>
                <div className="flex flex-wrap gap-2">
                  {availableCommonSkills.slice(0, 6).map((skill) => (
                    <Button
                      key={skill}
                      variant="outline"
                      size="sm"
                      onClick={() => setNewSkill(skill)}
                      className="text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {skill}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Current Skills */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Current Skills ({skills.length})</Label>
              {skills.length === 0 ? (
                <p className="text-sm text-muted-foreground italic py-4 text-center">
                  No skills assigned yet. Add skills above.
                </p>
              ) : (
                <div className="space-y-2">
                  {skills.map((skill) => (
                    <div
                      key={skill.id}
                      className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
                    >
                      <div className="flex items-center gap-3">
                        <Wrench className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{skill.skill_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={skill.proficiency_level}
                          onValueChange={(value) => handleUpdateProficiency(skill.id, value)}
                        >
                          <SelectTrigger className="w-[140px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PROFICIENCY_LEVELS.map((level) => (
                              <SelectItem key={level.value} value={level.value}>
                                {level.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveSkill(skill.id, skill.skill_name)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
