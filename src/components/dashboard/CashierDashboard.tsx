import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  CreditCard,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  DollarSign,
  TrendingUp,
  Banknote,
} from 'lucide-react';
import { format } from 'date-fns';

interface CashierStats {
  pendingPayments: number;
  completedToday: number;
  totalRevenueToday: number;
  totalRevenuePending: number;
}

interface PaymentInvoice {
  id: string;
  invoice_number: string;
  status: string;
  payment_status: string;
  customer_name: string;
  grand_total: number;
  updated_at: string;
}

export default function CashierDashboard() {
  const { employee } = useAuth();
  const [stats, setStats] = useState<CashierStats>({
    pendingPayments: 0,
    completedToday: 0,
    totalRevenueToday: 0,
    totalRevenuePending: 0,
  });
  const [pendingInvoices, setPendingInvoices] = useState<PaymentInvoice[]>([]);
  const [recentPayments, setRecentPayments] = useState<PaymentInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCashierData();
  }, []);

  const fetchCashierData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Fetch pending payments (completed but not paid)
      const { data: pendingData, count: pendingCount } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          status,
          payment_status,
          grand_total,
          updated_at,
          customers (name)
        `, { count: 'exact' })
        .eq('status', 'completed')
        .neq('payment_status', 'paid')
        .order('updated_at', { ascending: false })
        .limit(10);

      // Fetch completed & paid today
      const { data: paidTodayData, count: completedCount } = await supabase
        .from('invoices')
        .select('*', { count: 'exact' })
        .eq('status', 'paid')
        .gte('updated_at', `${today}T00:00:00`)
        .lte('updated_at', `${today}T23:59:59`);

      // Calculate today's revenue
      const todayRevenue = paidTodayData?.reduce((sum, inv) => sum + (inv.grand_total || 0), 0) || 0;

      // Calculate pending revenue
      const pendingRevenue = pendingData?.reduce((sum, inv) => sum + (inv.grand_total || 0), 0) || 0;

      // Fetch recent payments
      const { data: recentData } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          status,
          payment_status,
          grand_total,
          updated_at,
          customers (name)
        `)
        .eq('status', 'paid')
        .order('updated_at', { ascending: false })
        .limit(5);

      setStats({
        pendingPayments: pendingCount || 0,
        completedToday: completedCount || 0,
        totalRevenueToday: todayRevenue,
        totalRevenuePending: pendingRevenue,
      });

      if (pendingData) {
        setPendingInvoices(pendingData.map(inv => ({
          id: inv.id,
          invoice_number: inv.invoice_number,
          status: inv.status,
          payment_status: inv.payment_status || 'unpaid',
          customer_name: (inv.customers as { name: string } | null)?.name || 'Unknown',
          grand_total: inv.grand_total || 0,
          updated_at: inv.updated_at,
        })));
      }

      if (recentData) {
        setRecentPayments(recentData.map(inv => ({
          id: inv.id,
          invoice_number: inv.invoice_number,
          status: inv.status,
          payment_status: inv.payment_status || 'paid',
          customer_name: (inv.customers as { name: string } | null)?.name || 'Unknown',
          grand_total: inv.grand_total || 0,
          updated_at: inv.updated_at,
        })));
      }
    } catch (error) {
      console.error('Error fetching cashier data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getPaymentStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      unpaid: { label: 'Unpaid', className: 'bg-amber-100 text-amber-800 border-amber-200' },
      partial: { label: 'Partial', className: 'bg-blue-100 text-blue-800 border-blue-200' },
      paid: { label: 'Paid', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    };
    const config = statusConfig[status] || { label: status, className: '' };
    return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
  };

  const statCards = [
    {
      title: 'Pending Payments',
      value: stats.pendingPayments,
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
    },
    {
      title: 'Completed Today',
      value: stats.completedToday,
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
    },
    {
      title: "Today's Revenue",
      value: formatCurrency(stats.totalRevenueToday),
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      isAmount: true,
    },
    {
      title: 'Pending Revenue',
      value: formatCurrency(stats.totalRevenuePending),
      icon: Banknote,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      isAmount: true,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome, {employee?.name?.split(' ')[0] || 'Cashier'}!
          </h1>
          <p className="text-muted-foreground">
            Manage payments and track revenue for completed invoices.
          </p>
        </div>
        <Button asChild>
          <Link to="/invoices">
            <CreditCard className="mr-2 h-4 w-4" />
            Process Payments
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <Card key={index} className="stats-card">
            <div className="stats-card-gradient" />
            <CardContent className="relative p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className={`mt-1 ${stat.isAmount ? 'text-xl font-bold' : 'text-3xl font-bold'}`}>
                    {stat.value}
                  </p>
                </div>
                <div className={`rounded-lg p-3 ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pending Payments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-amber-600" />
              Pending Payments
            </CardTitle>
            <CardDescription>Invoices awaiting payment processing</CardDescription>
          </div>
          <Button variant="outline" asChild>
            <Link to="/invoices">
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : pendingInvoices.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
              <h3 className="mt-4 text-lg font-medium">All caught up!</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                No pending payments at the moment.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Payment Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingInvoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-sm">
                        {inv.invoice_number}
                      </TableCell>
                      <TableCell>{inv.customer_name}</TableCell>
                      <TableCell>
                        {getPaymentStatusBadge(inv.payment_status)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(inv.grand_total)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" asChild>
                          <Link to={`/invoices/${inv.id}`}>
                            Process
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Payments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            Recent Payments
          </CardTitle>
          <CardDescription>Recently completed payments</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : recentPayments.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">No payments yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Completed payments will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentPayments.map((inv) => (
                <Link
                  key={inv.id}
                  to={`/invoices/${inv.id}`}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-muted-foreground">
                        {inv.invoice_number}
                      </span>
                      {getPaymentStatusBadge(inv.payment_status)}
                    </div>
                    <p className="font-medium mt-1 truncate">{inv.customer_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(inv.updated_at), 'MMM d, yyyy HH:mm')}
                    </p>
                  </div>
                  <div className="ml-4 text-right">
                    <p className="font-bold text-emerald-600">
                      {formatCurrency(inv.grand_total)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
