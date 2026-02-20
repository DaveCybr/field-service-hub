import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import CustomerLayout from '@/components/layout/CustomerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, Clock, CheckCircle2, Wrench, Calendar,
  MapPin, User, Phone, FileText, Image,
} from 'lucide-react';
import { format } from 'date-fns';

interface ServiceDetail {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  scheduled_date: string | null;
  created_at: string;
  service_address: string | null;
  total_cost: number;
  service_cost: number;
  parts_cost: number;
  technician_notes: string | null;
  before_photos: string[];
  after_photos: string[];
  actual_checkin_at: string | null;
  actual_checkout_at: string | null;
  unit: { 
    unit_type: string; 
    brand: string | null; 
    model: string | null;
    serial_number: string | null;
  } | null;
  technician: { name: string; phone: string | null } | null;
  invoice: {
    invoice_number: string;
  };
}

export default function CustomerJobDetail() {
  const { id } = useParams<{ id: string }>();
  const { customerName } = useCustomerAuth();
  const [loading, setLoading] = useState(true);
  const [service, setService] = useState<ServiceDetail | null>(null);

  useEffect(() => {
    if (id) fetchServiceDetail();
  }, [id]);

  const fetchServiceDetail = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('invoice_services')
        .select(`
          id, title, description, status, priority,
          scheduled_date, created_at, service_address, total_cost,
          service_cost, parts_cost, technician_notes,
          before_photos, after_photos,
          actual_checkin_at, actual_checkout_at,
          unit:units(unit_type, brand, model, serial_number),
          technician:employees!invoice_services_assigned_technician_id_fkey(name, phone),
          invoice:invoices!inner(invoice_number)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setService(data as any);
    } catch (error) {
      console.error('Error fetching service:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    const config: Record<string, { label: string; className: string; icon: any; description: string }> = {
      pending: { label: 'Menunggu', className: 'bg-amber-100 text-amber-800', icon: Clock, description: 'Kami sedang menugaskan teknisi untuk pekerjaan Anda' },
      assigned: { label: 'Dijadwalkan', className: 'bg-sky-100 text-sky-800', icon: Calendar, description: 'Pekerjaan Anda sudah dijadwalkan' },
      in_progress: { label: 'Sedang Dikerjakan', className: 'bg-blue-100 text-blue-800', icon: Wrench, description: 'Teknisi sedang mengerjakan pekerjaan Anda' },
      completed: { label: 'Selesai', className: 'bg-emerald-100 text-emerald-800', icon: CheckCircle2, description: 'Pekerjaan servis telah selesai' },
      cancelled: { label: 'Dibatalkan', className: 'bg-gray-100 text-gray-800', icon: Clock, description: 'Pekerjaan ini dibatalkan' },
    };
    return config[status] || { label: status, className: '', icon: Clock, description: '' };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
  };

  if (loading) {
    return (
      <CustomerLayout customerName={customerName || 'Pelanggan'}>
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </CustomerLayout>
    );
  }

  if (!service) {
    return (
      <CustomerLayout customerName={customerName || 'Pelanggan'}>
        <div className="text-center py-12">
          <h2 className="text-lg font-medium">Servis tidak ditemukan</h2>
          <Button asChild className="mt-4">
            <Link to="/portal/jobs">Kembali ke Daftar Servis</Link>
          </Button>
        </div>
      </CustomerLayout>
    );
  }

  const statusConfig = getStatusConfig(service.status);
  const StatusIcon = statusConfig.icon;

  return (
    <CustomerLayout customerName={customerName || 'Pelanggan'}>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/portal/jobs"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">{service.title}</h1>
              <Badge className={statusConfig.className}>{statusConfig.label}</Badge>
            </div>
            <p className="text-muted-foreground mt-1">{service.invoice.invoice_number}</p>
          </div>
        </div>

        <Card className={`border-l-4 ${service.status === 'in_progress' ? 'border-l-blue-500' : service.status === 'completed' ? 'border-l-emerald-500' : 'border-l-amber-500'}`}>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <div className={`h-12 w-12 rounded-full flex items-center justify-center ${statusConfig.className}`}>
                <StatusIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="font-medium">{statusConfig.label}</p>
                <p className="text-sm text-muted-foreground">{statusConfig.description}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Detail Servis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {service.description && (
                <div>
                  <p className="text-sm text-muted-foreground">Deskripsi</p>
                  <p className="mt-1">{service.description}</p>
                </div>
              )}
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Dibuat</p>
                  <p className="font-medium">{format(new Date(service.created_at), 'dd MMM yyyy')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Dijadwalkan</p>
                  <p className="font-medium">
                    {service.scheduled_date ? format(new Date(service.scheduled_date), 'dd MMM yyyy') : 'Belum dijadwalkan'}
                  </p>
                </div>
              </div>
              {service.service_address && (
                <>
                  <Separator />
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Alamat Servis</p>
                      <p className="mt-1">{service.service_address}</p>
                    </div>
                  </div>
                </>
              )}
              {service.unit && (
                <>
                  <Separator />
                  <div className="flex items-start gap-2">
                    <Wrench className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Unit</p>
                      <p className="font-medium mt-1">
                        {service.unit.unit_type} {service.unit.brand && `- ${service.unit.brand}`} {service.unit.model}
                      </p>
                      {service.unit.serial_number && (
                        <p className="text-sm text-muted-foreground">S/N: {service.unit.serial_number}</p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            {service.technician && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Teknisi
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{service.technician.name}</p>
                      {service.technician.phone && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {service.technician.phone}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader><CardTitle>Ringkasan Biaya</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Biaya Servis</span>
                    <span>{formatCurrency(service.service_cost || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Biaya Suku Cadang</span>
                    <span>{formatCurrency(service.parts_cost || 0)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span className="text-primary">{formatCurrency(service.total_cost || 0)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {service.technician_notes && (
          <Card>
            <CardHeader><CardTitle>Catatan Teknisi</CardTitle></CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{service.technician_notes}</p>
            </CardContent>
          </Card>
        )}

        {(service.before_photos?.length > 0 || service.after_photos?.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Foto Servis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {service.before_photos?.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-3">Sebelum Servis</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {service.before_photos.map((url, idx) => (
                      <img key={idx} src={url} alt={`Sebelum ${idx + 1}`} className="rounded-lg aspect-square object-cover" />
                    ))}
                  </div>
                </div>
              )}
              {service.after_photos?.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-3">Sesudah Servis</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {service.after_photos.map((url, idx) => (
                      <img key={idx} src={url} alt={`Sesudah ${idx + 1}`} className="rounded-lg aspect-square object-cover" />
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </CustomerLayout>
  );
}
