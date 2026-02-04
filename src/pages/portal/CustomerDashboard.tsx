import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import CustomerLayout from '@/components/layout/CustomerLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Briefcase, 
  Clock, 
  CheckCircle2, 
  Wrench, 
  Calendar,
  ChevronRight,
  ArrowUpRight,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';

interface InvoiceWithServices {
  id: string;
  invoice_number: string;
  status: string;
  created_at: string;
  services: {
    id: string;
    title: string;
    status: string;
    scheduled_date: string | null;
  }[];
}

interface Stats {
  activeServices: number;
  completedServices: number;
  totalUnits: number;
  pendingInvoices: number;
}

export default function CustomerDashboard() {
  const { customerName, customerId } = useCustomerAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({ activeServices: 0, completedServices: 0, totalUnits: 0, pendingInvoices: 0 });
  const [recentInvoices, setRecentInvoices] = useState<InvoiceWithServices[]>([]);

  useEffect(() => {
    if (customerId) {
      fetchDashboardData();
    }
  }, [customerId]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch invoices with services
      const { data: invoices } = await supabase
        .from('invoices')
        .select(`
          id, 
          invoice_number, 
          status, 
          created_at,
          invoice_services (
            id,
            title,
            status,
            scheduled_date
          )
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(5);

      // Count units
      const { count: unitsCount } = await supabase
        .from('units')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', customerId);

      // Calculate stats from invoices and services
      const allInvoices = invoices || [];
      let activeServices = 0;
      let completedServices = 0;
      
      allInvoices.forEach(inv => {
        const services = inv.invoice_services || [];
        services.forEach((s: any) => {
          if (s.status === 'completed') {
            completedServices++;
          } else if (s.status !== 'cancelled') {
            activeServices++;
          }
        });
      });

      const pendingInvoices = allInvoices.filter(inv => 
        inv.status === 'pending' || inv.status === 'in_progress'
      ).length;

      setStats({
        activeServices,
        completedServices,
        totalUnits: unitsCount || 0,
        pendingInvoices,
      });

      setRecentInvoices(allInvoices.map(inv => ({
        ...inv,
        services: inv.invoice_services || [],
      })));
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    const config: Record<string, { label: string; className: string; icon: any }> = {
      draft: { label: 'Draft', className: 'bg-gray-100 text-gray-800', icon: FileText },
      pending: { label: 'Pending', className: 'bg-amber-100 text-amber-800', icon: Clock },
      in_progress: { label: 'In Progress', className: 'bg-blue-100 text-blue-800', icon: Wrench },
      completed: { label: 'Completed', className: 'bg-emerald-100 text-emerald-800', icon: CheckCircle2 },
      paid: { label: 'Paid', className: 'bg-emerald-100 text-emerald-800', icon: CheckCircle2 },
      cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-800', icon: Clock },
    };
    return config[status] || { label: status, className: '', icon: Clock };
  };

  return (
    <CustomerLayout customerName={customerName || 'Customer'}>
      <div className="space-y-6 animate-fade-in">
        {/* Welcome Section */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back, {customerName?.split(' ')[0] || 'Customer'}!
          </h1>
          <p className="text-muted-foreground">
            Here's an overview of your service activity
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Services</p>
                  <p className="text-3xl font-bold">{stats.activeServices}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Briefcase className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Invoices</p>
                  <p className="text-3xl font-bold">{stats.pendingInvoices}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed Services</p>
                  <p className="text-3xl font-bold">{stats.completedServices}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Registered Units</p>
                  <p className="text-3xl font-bold">{stats.totalUnits}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <Wrench className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Invoices */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Invoices</CardTitle>
              <CardDescription>Your latest service invoices</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/portal/jobs">
                View All
                <ArrowUpRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : recentInvoices.length === 0 ? (
              <div className="text-center py-8">
                <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <h3 className="font-medium">No invoices yet</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Your service invoices will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentInvoices.map((invoice) => {
                  const statusConfig = getStatusConfig(invoice.status);
                  const StatusIcon = statusConfig.icon;
                  const serviceCount = invoice.services.length;
                  
                  return (
                    <Link
                      key={invoice.id}
                      to={`/portal/jobs/${invoice.invoice_number}`}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${statusConfig.className}`}>
                          <StatusIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">{invoice.invoice_number}</p>
                          <p className="text-sm text-muted-foreground">
                            {serviceCount} service{serviceCount !== 1 ? 's' : ''} • {format(new Date(invoice.created_at), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={statusConfig.className}>{statusConfig.label}</Badge>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </CustomerLayout>
  );
}
