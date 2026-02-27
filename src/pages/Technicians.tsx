import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Search,
  Phone,
  Mail,
  RefreshCw,
  Wrench,
  Clock,
  UserCheck,
  AlertCircle,
  Briefcase,
  TrendingUp,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Technician {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  total_jobs_completed: number;
  avatar_url: string | null;
  active_jobs_count: number;
}

export default function Technicians() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTechName, setNewTechName] = useState("");
  const [newTechEmail, setNewTechEmail] = useState("");
  const [newTechPhone, setNewTechPhone] = useState("");
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  const availableTechs = technicians.filter(
    (t) => t.active_jobs_count === 0 && t.status === "available",
  ).length;
  const busyTechs = technicians.filter((t) => t.active_jobs_count > 0).length;
  const totalActiveJobs = technicians.reduce(
    (sum, t) => sum + t.active_jobs_count,
    0,
  );

  useEffect(() => {
    fetchTechnicians();
  }, []);

  const fetchTechnicians = async () => {
    setLoading(true);
    try {
      const { data: techData, error: techError } = await supabase
        .from("employees")
        .select(
          `
          *,
          active_jobs:invoice_services!assigned_technician_id(count)
        `,
        )
        .eq("role", "technician")
        .order("name");

      if (techError) throw techError;

      const techWithCount =
        techData?.map((tech) => ({
          ...tech,
          total_jobs_completed: tech.total_jobs_completed || 0,
          active_jobs_count: tech.active_jobs?.[0]?.count || 0,
        })) || [];

      setTechnicians(techWithCount);
    } catch (error) {
      console.error("Error fetching technicians:", error);
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("messages.loadFailed"),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTechnician = async () => {
    if (!newTechName || !newTechEmail) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("validation.nameEmailRequired"),
      });
      return;
    }

    setCreating(true);
    try {
      const { error } = await supabase.from("employees").insert([
        {
          name: newTechName,
          email: newTechEmail,
          phone: newTechPhone || null,
          role: "technician",
          status: "available",
        },
      ]);

      if (error) throw error;

      toast({
        title: t("technicians.technicianAdded"),
        description: t("technicians.technicianAddedDesc", {
          name: newTechName,
        }),
      });

      setDialogOpen(false);
      setNewTechName("");
      setNewTechEmail("");
      setNewTechPhone("");
      fetchTechnicians();
    } catch (error: any) {
      console.error("Error creating technician:", error);
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: error.message || t("messages.saveFailed"),
      });
    } finally {
      setCreating(false);
    }
  };

  const getStatusBadge = (status: string, activeJobs: number) => {
    // Status locked/off_duty = override manual, tampilkan apa adanya
    if (status === "locked") {
      return (
        <Badge className="bg-red-100 text-red-800">
          <AlertCircle className="h-3 w-3 mr-1" />
          {t("technicians.locked")}
        </Badge>
      );
    }
    if (status === "off_duty") {
      return (
        <Badge className="bg-gray-100 text-gray-800">
          <Clock className="h-3 w-3 mr-1" />
          {t("technicians.offDuty")}
        </Badge>
      );
    }

    // Status available/on_job = gunakan active_jobs_count sebagai sumber kebenaran
    if (activeJobs > 0) {
      return (
        <Badge className="bg-amber-100 text-amber-800">
          <Wrench className="h-3 w-3 mr-1" />
          {t("technicians.onJob")}
        </Badge>
      );
    }

    return (
      <Badge className="bg-green-100 text-green-800">
        <UserCheck className="h-3 w-3 mr-1" />
        {t("technicians.available")}
      </Badge>
    );
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredTechnicians = technicians.filter(
    (tech) =>
      tech.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tech.email.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {t("technicians.title")}
            </h1>
            <p className="text-muted-foreground">{t("technicians.subtitle")}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/jobs?status=pending")}
            >
              <Briefcase className="mr-2 h-4 w-4" />
              Pending Jobs
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  {t("technicians.addTechnician")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("technicians.newTechnician")}</DialogTitle>
                  <DialogDescription>
                    {t("technicians.enterDetails")}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">{t("auth.fullName")} *</Label>
                    <Input
                      id="name"
                      placeholder="John Doe"
                      value={newTechName}
                      onChange={(e) => setNewTechName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">{t("common.email")} *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      value={newTechEmail}
                      onChange={(e) => setNewTechEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">{t("common.phone")}</Label>
                    <Input
                      id="phone"
                      placeholder="+62 812 3456 7890"
                      value={newTechPhone}
                      onChange={(e) => setNewTechPhone(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button onClick={handleCreateTechnician} disabled={creating}>
                    {creating
                      ? t("common.adding")
                      : t("technicians.addTechnician")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Available
                  </p>
                  <p className="text-3xl font-bold mt-1">{availableTechs}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ready for jobs
                  </p>
                </div>
                <div className="rounded-lg p-3 bg-green-100">
                  <UserCheck className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Busy
                  </p>
                  <p className="text-3xl font-bold mt-1">{busyTechs}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Currently working
                  </p>
                </div>
                <div className="rounded-lg p-3 bg-amber-100">
                  <Clock className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Active Jobs
                  </p>
                  <p className="text-3xl font-bold mt-1">{totalActiveJobs}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    In progress
                  </p>
                </div>
                <div className="rounded-lg p-3 bg-blue-100">
                  <Wrench className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t("technicians.searchTechnicians")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" onClick={fetchTechnicians}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Technicians Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : filteredTechnicians.length === 0 ? (
              <div className="text-center py-12">
                <h3 className="text-lg font-medium">
                  {t("technicians.noTechniciansFound")}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t("technicians.addFirstTechnician")}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("technicians.title")}</TableHead>
                      <TableHead>{t("common.contact")}</TableHead>
                      <TableHead>{t("common.status")}</TableHead>
                      <TableHead>Active Jobs</TableHead>
                      <TableHead>{t("technicians.jobsCompleted")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTechnicians.map((tech) => (
                      <TableRow key={tech.id} className="table-row-hover">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <Avatar>
                                <AvatarImage
                                  src={tech.avatar_url || undefined}
                                />
                                <AvatarFallback className="bg-primary text-primary-foreground">
                                  {getInitials(tech.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div
                                className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
                                  tech.active_jobs_count === 0 &&
                                  tech.status === "available"
                                    ? "bg-green-500"
                                    : "bg-amber-500"
                                }`}
                              />
                            </div>
                            <div>
                              <p className="font-medium">{tech.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {tech.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {tech.phone && (
                              <div className="flex items-center gap-1 text-sm">
                                <Phone className="h-3 w-3 text-muted-foreground" />
                                {tech.phone}
                              </div>
                            )}
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              {tech.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(tech.status, tech.active_jobs_count)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold">
                              {tech.active_jobs_count}
                            </span>
                            {tech.active_jobs_count > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs"
                                onClick={() =>
                                  navigate(`/jobs?technician=${tech.id}`)
                                }
                              >
                                View
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium">
                              {tech.total_jobs_completed}
                            </span>
                            <span className="text-muted-foreground text-sm">
                              {t("technicians.jobs")}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
