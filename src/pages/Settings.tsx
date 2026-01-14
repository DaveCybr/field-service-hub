import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  User,
  Bell,
  Settings as SettingsIcon,
  Shield,
  Palette,
  Save,
  Camera,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface NotificationPreferences {
  newJobs: boolean;
  jobUpdates: boolean;
  lowStock: boolean;
  assignments: boolean;
  emailNotifications: boolean;
  soundEnabled: boolean;
}

interface SystemSettings {
  language: string;
  timezone: string;
  dateFormat: string;
  currency: string;
  defaultJobDuration: string;
  autoAssignEnabled: boolean;
}

export default function Settings() {
  const { user, employee } = useAuth();
  const { toast } = useToast();
  
  // Profile state
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  
  // Notification preferences
  const [notifications, setNotifications] = useState<NotificationPreferences>({
    newJobs: true,
    jobUpdates: true,
    lowStock: true,
    assignments: true,
    emailNotifications: false,
    soundEnabled: true,
  });
  const [savingNotifications, setSavingNotifications] = useState(false);
  
  // System settings
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    language: 'en',
    timezone: 'Asia/Jakarta',
    dateFormat: 'DD/MM/YYYY',
    currency: 'IDR',
    defaultJobDuration: '60',
    autoAssignEnabled: true,
  });
  const [savingSystem, setSavingSystem] = useState(false);

  useEffect(() => {
    if (employee) {
      setProfileName(employee.name || '');
      setProfileEmail(employee.email || '');
    }
    
    // Load saved preferences from localStorage
    const savedNotifications = localStorage.getItem('notificationPreferences');
    if (savedNotifications) {
      setNotifications(JSON.parse(savedNotifications));
    }
    
    const savedSystem = localStorage.getItem('systemSettings');
    if (savedSystem) {
      setSystemSettings(JSON.parse(savedSystem));
    }
    
    // Fetch phone from employees table
    if (employee?.id) {
      fetchEmployeePhone();
    }
  }, [employee]);

  const fetchEmployeePhone = async () => {
    if (!employee?.id) return;
    
    const { data } = await supabase
      .from('employees')
      .select('phone')
      .eq('id', employee.id)
      .single();
    
    if (data?.phone) {
      setProfilePhone(data.phone);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSaveProfile = async () => {
    if (!employee?.id) return;
    
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from('employees')
        .update({
          name: profileName,
          phone: profilePhone || null,
        })
        .eq('id', employee.id);

      if (error) throw error;

      toast({
        title: 'Profile Updated',
        description: 'Your profile has been saved successfully.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update profile.',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveNotifications = () => {
    setSavingNotifications(true);
    
    // Save to localStorage (in a real app, save to database)
    localStorage.setItem('notificationPreferences', JSON.stringify(notifications));
    
    setTimeout(() => {
      setSavingNotifications(false);
      toast({
        title: 'Preferences Saved',
        description: 'Your notification preferences have been updated.',
      });
    }, 500);
  };

  const handleSaveSystemSettings = () => {
    setSavingSystem(true);
    
    // Save to localStorage (in a real app, save to database)
    localStorage.setItem('systemSettings', JSON.stringify(systemSettings));
    
    setTimeout(() => {
      setSavingSystem(false);
      toast({
        title: 'Settings Saved',
        description: 'System settings have been updated.',
      });
    }, 500);
  };

  const updateNotification = (key: keyof NotificationPreferences, value: boolean) => {
    setNotifications(prev => ({ ...prev, [key]: value }));
  };

  const updateSystemSetting = (key: keyof SystemSettings, value: string | boolean) => {
    setSystemSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-[400px]">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Alerts</span>
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <SettingsIcon className="h-4 w-4" />
              <span className="hidden sm:inline">System</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your personal information and contact details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar */}
                <div className="flex items-center gap-6">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={employee?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                      {profileName ? getInitials(profileName) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <Button variant="outline" size="sm" disabled>
                      <Camera className="h-4 w-4 mr-2" />
                      Change Photo
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      JPG, PNG or GIF. Max 2MB.
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Form Fields */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder="Enter your name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileEmail}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      Email cannot be changed
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      placeholder="+62 812 3456 7890"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Input
                      value={employee?.role || 'Member'}
                      disabled
                      className="bg-muted capitalize"
                    />
                    <p className="text-xs text-muted-foreground">
                      Contact admin to change role
                    </p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveProfile} disabled={savingProfile}>
                    <Save className="h-4 w-4 mr-2" />
                    {savingProfile ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Choose what notifications you want to receive
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>New Jobs</Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified when new jobs are created
                      </p>
                    </div>
                    <Switch
                      checked={notifications.newJobs}
                      onCheckedChange={(v) => updateNotification('newJobs', v)}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Job Status Updates</Label>
                      <p className="text-sm text-muted-foreground">
                        Notifications when job statuses change
                      </p>
                    </div>
                    <Switch
                      checked={notifications.jobUpdates}
                      onCheckedChange={(v) => updateNotification('jobUpdates', v)}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Job Assignments</Label>
                      <p className="text-sm text-muted-foreground">
                        Alert when you're assigned to a job
                      </p>
                    </div>
                    <Switch
                      checked={notifications.assignments}
                      onCheckedChange={(v) => updateNotification('assignments', v)}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Low Stock Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Notify when inventory items are running low
                      </p>
                    </div>
                    <Switch
                      checked={notifications.lowStock}
                      onCheckedChange={(v) => updateNotification('lowStock', v)}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Sound Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Play sound for new notifications
                      </p>
                    </div>
                    <Switch
                      checked={notifications.soundEnabled}
                      onCheckedChange={(v) => updateNotification('soundEnabled', v)}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications via email
                      </p>
                    </div>
                    <Switch
                      checked={notifications.emailNotifications}
                      onCheckedChange={(v) => updateNotification('emailNotifications', v)}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveNotifications} disabled={savingNotifications}>
                    <Save className="h-4 w-4 mr-2" />
                    {savingNotifications ? 'Saving...' : 'Save Preferences'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Tab */}
          <TabsContent value="system">
            <Card>
              <CardHeader>
                <CardTitle>System Configuration</CardTitle>
                <CardDescription>
                  Configure system-wide settings and defaults
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Language</Label>
                    <Select
                      value={systemSettings.language}
                      onValueChange={(v) => updateSystemSetting('language', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="id">Bahasa Indonesia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Timezone</Label>
                    <Select
                      value={systemSettings.timezone}
                      onValueChange={(v) => updateSystemSetting('timezone', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Asia/Jakarta">WIB (Jakarta)</SelectItem>
                        <SelectItem value="Asia/Makassar">WITA (Makassar)</SelectItem>
                        <SelectItem value="Asia/Jayapura">WIT (Jayapura)</SelectItem>
                        <SelectItem value="UTC">UTC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date Format</Label>
                    <Select
                      value={systemSettings.dateFormat}
                      onValueChange={(v) => updateSystemSetting('dateFormat', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select
                      value={systemSettings.currency}
                      onValueChange={(v) => updateSystemSetting('currency', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="IDR">IDR (Rupiah)</SelectItem>
                        <SelectItem value="USD">USD (Dollar)</SelectItem>
                        <SelectItem value="EUR">EUR (Euro)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Default Job Duration (minutes)</Label>
                    <Select
                      value={systemSettings.defaultJobDuration}
                      onValueChange={(v) => updateSystemSetting('defaultJobDuration', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="90">1.5 hours</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                        <SelectItem value="180">3 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-Assign Technicians</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable automatic technician assignment suggestions
                    </p>
                  </div>
                  <Switch
                    checked={systemSettings.autoAssignEnabled}
                    onCheckedChange={(v) => updateSystemSetting('autoAssignEnabled', v)}
                  />
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveSystemSettings} disabled={savingSystem}>
                    <Save className="h-4 w-4 mr-2" />
                    {savingSystem ? 'Saving...' : 'Save Settings'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Manage your account security and password
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Password</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Change your password to keep your account secure
                    </p>
                    <Button variant="outline" disabled>
                      Change Password
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      Password change is coming soon
                    </p>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="text-sm font-medium mb-2">Active Sessions</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      View and manage your active sessions
                    </p>
                    <div className="p-4 border rounded-lg bg-muted/30">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Current Session</p>
                          <p className="text-xs text-muted-foreground">
                            Logged in as {user?.email}
                          </p>
                        </div>
                        <span className="text-xs text-emerald-600 font-medium">Active</span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="text-sm font-medium mb-2 text-destructive">Danger Zone</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Permanently delete your account and all associated data
                    </p>
                    <Button variant="destructive" disabled>
                      Delete Account
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      Contact admin to delete your account
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
