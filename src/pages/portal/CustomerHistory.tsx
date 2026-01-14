import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import CustomerLayout from '@/components/layout/CustomerLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  History,
  CheckCircle2, 
  Calendar,
  MapPin,
  Wrench,
} from 'lucide-react';
import { format } from 'date-fns';

interface HistoryJob {
  id: string;
  job_number: string;
  title: string;
  status: string;
  scheduled_date: string | null;
  created_at: string;
  actual_checkout_at: string | null;
  total_cost: number;
  units: { unit_type: string; brand: string | null } | null;
}

export default function CustomerHistory() {
  const { customerName, customerId } = useCustomerAuth();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<HistoryJob[]>([]);

  useEffect(() => {
    if (customerId) {
      fetchHistory();
    }
  }, [customerId]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('service_jobs')
        .select(`
          id, job_number, title, status, scheduled_date, 
          created_at, actual_checkout_at, total_cost,
          units (unit_type, brand)
        `)
        .eq('customer_id', customerId)
        .in('status', ['completed', 'completed_paid', 'cancelled'])
        .order('actual_checkout_at', { ascending: false, nullsFirst: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error('Error fetching history:', error);
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

  return (
    <CustomerLayout customerName={customerName || 'Customer'}>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Service History</h1>
          <p className="text-muted-foreground">
            View your completed service jobs
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : jobs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <History className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-medium">No service history</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Your completed service jobs will appear here
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <Card key={job.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-full bg-emerald-100 flex-shrink-0 flex items-center justify-center">
                        <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{job.title}</h3>
                        <p className="text-sm text-muted-foreground">{job.job_number}</p>
                        {job.units && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                            <Wrench className="h-3 w-3" />
                            {job.units.unit_type} {job.units.brand && `- ${job.units.brand}`}
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <Calendar className="h-3 w-3" />
                          Completed: {job.actual_checkout_at 
                            ? format(new Date(job.actual_checkout_at), 'MMM d, yyyy')
                            : job.scheduled_date 
                              ? format(new Date(job.scheduled_date), 'MMM d, yyyy')
                              : 'N/A'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={job.status === 'cancelled' ? 'bg-gray-100 text-gray-800' : 'bg-emerald-100 text-emerald-800'}>
                        {job.status === 'cancelled' ? 'Cancelled' : 'Completed'}
                      </Badge>
                      <p className="text-lg font-semibold mt-2">{formatCurrency(job.total_cost || 0)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}