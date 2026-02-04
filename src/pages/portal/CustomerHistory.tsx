import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import CustomerLayout from '@/components/layout/CustomerLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  History,
  CheckCircle2, 
  Calendar,
  Wrench,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';

interface HistoryInvoice {
  id: string;
  invoice_number: string;
  status: string;
  grand_total: number;
  created_at: string;
  services: {
    id: string;
    title: string;
    status: string;
    actual_checkout_at: string | null;
    unit?: { unit_type: string; brand: string | null } | null;
  }[];
}

export default function CustomerHistory() {
  const { customerName, customerId } = useCustomerAuth();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<HistoryInvoice[]>([]);

  useEffect(() => {
    if (customerId) {
      fetchHistory();
    }
  }, [customerId]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          id, 
          invoice_number, 
          status, 
          grand_total,
          created_at,
          invoice_services (
            id,
            title,
            status,
            actual_checkout_at,
            unit:units (unit_type, brand)
          )
        `)
        .eq('customer_id', customerId)
        .in('status', ['completed', 'paid', 'cancelled'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setInvoices((data || []).map(inv => ({
        ...inv,
        services: (inv.invoice_services || []).map((s: any) => ({
          ...s,
          unit: Array.isArray(s.unit) ? s.unit[0] : s.unit,
        })),
      })));
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
            View your completed invoices and services
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : invoices.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <History className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-medium">No service history</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Your completed invoices will appear here
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {invoices.map((invoice) => (
              <Card key={invoice.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-full bg-emerald-100 flex-shrink-0 flex items-center justify-center">
                        {invoice.status === 'cancelled' ? (
                          <FileText className="h-6 w-6 text-gray-600" />
                        ) : (
                          <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold">{invoice.invoice_number}</h3>
                        <p className="text-sm text-muted-foreground">
                          {invoice.services.length} service{invoice.services.length !== 1 ? 's' : ''}
                        </p>
                        {invoice.services.slice(0, 2).map((service) => (
                          <div key={service.id} className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                            <Wrench className="h-3 w-3" />
                            {service.title}
                            {service.unit && ` - ${service.unit.unit_type}`}
                          </div>
                        ))}
                        {invoice.services.length > 2 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            +{invoice.services.length - 2} more service(s)
                          </p>
                        )}
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(invoice.created_at), 'MMM d, yyyy')}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={invoice.status === 'cancelled' ? 'bg-gray-100 text-gray-800' : 'bg-emerald-100 text-emerald-800'}>
                        {invoice.status === 'cancelled' ? 'Cancelled' : invoice.status === 'paid' ? 'Paid' : 'Completed'}
                      </Badge>
                      <p className="text-lg font-semibold mt-2">{formatCurrency(invoice.grand_total || 0)}</p>
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
