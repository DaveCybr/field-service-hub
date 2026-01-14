import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Plus,
  Search,
  RefreshCw,
  QrCode,
  Download,
  Wrench,
  Calendar,
  Shield,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';

interface Unit {
  id: string;
  qr_code: string;
  customer_id: string;
  customer_name: string;
  unit_type: string;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  capacity: string | null;
  warranty_expiry_date: string | null;
  last_service_date: string | null;
  total_services: number;
  created_at: string;
}

interface Customer {
  id: string;
  name: string;
}

const UNIT_TYPES = [
  'AC Split',
  'AC Standing',
  'AC Cassette',
  'AC Central',
  'Refrigerator',
  'Freezer',
  'Washing Machine',
  'Dryer',
  'Water Heater',
  'Stabilizer',
  'UPS',
  'Other',
];

export default function Units() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [creating, setCreating] = useState(false);

  const [formData, setFormData] = useState({
    customer_id: '',
    unit_type: '',
    brand: '',
    model: '',
    serial_number: '',
    capacity: '',
    warranty_expiry_date: '',
  });

  const { toast } = useToast();

  useEffect(() => {
    fetchUnits();
    fetchCustomers();
  }, [typeFilter]);

  const fetchUnits = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('units')
        .select(`
          *,
          customers (name)
        `)
        .order('created_at', { ascending: false });

      if (typeFilter !== 'all') {
        query = query.eq('unit_type', typeFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      setUnits(data?.map(unit => ({
        ...unit,
        customer_name: (unit.customers as any)?.name || 'Unknown',
        total_services: unit.total_services || 0,
      })) || []);
    } catch (error) {
      console.error('Error fetching units:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load units.',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    const { data } = await supabase
      .from('customers')
      .select('id, name')
      .eq('blacklisted', false)
      .order('name');
    if (data) setCustomers(data);
  };

  const generateQRCode = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `RT-${timestamp}-${random}`;
  };

  const handleCreateUnit = async () => {
    if (!formData.customer_id || !formData.unit_type) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Customer and unit type are required.',
      });
      return;
    }

    setCreating(true);
    try {
      const qr_code = generateQRCode();

      const { data, error } = await supabase
        .from('units')
        .insert([{
          qr_code,
          customer_id: formData.customer_id,
          unit_type: formData.unit_type,
          brand: formData.brand || null,
          model: formData.model || null,
          serial_number: formData.serial_number || null,
          capacity: formData.capacity || null,
          warranty_expiry_date: formData.warranty_expiry_date || null,
        }])
        .select(`
          *,
          customers (name)
        `)
        .single();

      if (error) throw error;

      toast({
        title: 'Unit Registered',
        description: `Unit ${qr_code} has been registered successfully.`,
      });

      // Show QR code dialog for the new unit
      setSelectedUnit({
        ...data,
        customer_name: (data.customers as any)?.name || 'Unknown',
        total_services: 0,
      });
      setDialogOpen(false);
      setQrDialogOpen(true);

      setFormData({
        customer_id: '',
        unit_type: '',
        brand: '',
        model: '',
        serial_number: '',
        capacity: '',
        warranty_expiry_date: '',
      });
      fetchUnits();
    } catch (error: any) {
      console.error('Error creating unit:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to register unit.',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleShowQR = (unit: Unit) => {
    setSelectedUnit(unit);
    setQrDialogOpen(true);
  };

  const handleDownloadQR = () => {
    if (!selectedUnit) return;

    const svg = document.getElementById('qr-code-svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = 300;
      canvas.height = 350;
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 50, 20, 200, 200);
        
        ctx.fillStyle = 'black';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(selectedUnit.qr_code, 150, 250);
        ctx.font = '12px Arial';
        ctx.fillText(`${selectedUnit.unit_type}`, 150, 275);
        if (selectedUnit.brand || selectedUnit.model) {
          ctx.fillText(`${selectedUnit.brand || ''} ${selectedUnit.model || ''}`.trim(), 150, 295);
        }
        ctx.fillText(selectedUnit.customer_name, 150, 315);

        const link = document.createElement('a');
        link.download = `QR-${selectedUnit.qr_code}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const isWarrantyActive = (date: string | null) => {
    if (!date) return false;
    return new Date(date) > new Date();
  };

  const filteredUnits = units.filter(unit =>
    unit.qr_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    unit.unit_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    unit.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (unit.brand && unit.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (unit.serial_number && unit.serial_number.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Unit Registry</h1>
            <p className="text-muted-foreground">
              Manage electronic devices with QR code tracking
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Register Unit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Register New Unit</DialogTitle>
                <DialogDescription>
                  Enter the device details. A unique QR code will be generated automatically.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="customer">Customer *</Label>
                  <Select
                    value={formData.customer_id}
                    onValueChange={(value) => setFormData({ ...formData, customer_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit_type">Unit Type *</Label>
                  <Select
                    value={formData.unit_type}
                    onValueChange={(value) => setFormData({ ...formData, unit_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {UNIT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="brand">Brand</Label>
                    <Input
                      id="brand"
                      placeholder="e.g., Daikin"
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="model">Model</Label>
                    <Input
                      id="model"
                      placeholder="e.g., FTV35BXV14"
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="serial">Serial Number</Label>
                    <Input
                      id="serial"
                      placeholder="Serial number"
                      value={formData.serial_number}
                      onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="capacity">Capacity</Label>
                    <Input
                      id="capacity"
                      placeholder="e.g., 1.5 PK"
                      value={formData.capacity}
                      onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="warranty">Warranty Expiry</Label>
                  <Input
                    id="warranty"
                    type="date"
                    value={formData.warranty_expiry_date}
                    onChange={(e) => setFormData({ ...formData, warranty_expiry_date: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateUnit} disabled={creating}>
                  {creating ? 'Registering...' : 'Register Unit'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by QR code, type, customer, brand..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Unit Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {UNIT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={fetchUnits}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Units Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : filteredUnits.length === 0 ? (
              <div className="text-center py-12">
                <QrCode className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-medium">No units found</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Register your first unit to start tracking devices.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>QR Code</TableHead>
                      <TableHead>Unit Details</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Warranty</TableHead>
                      <TableHead>Services</TableHead>
                      <TableHead>Last Service</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUnits.map((unit) => (
                      <TableRow key={unit.id} className="table-row-hover">
                        <TableCell>
                          <button
                            onClick={() => handleShowQR(unit)}
                            className="flex items-center gap-2 hover:text-primary transition-colors"
                          >
                            <div className="bg-muted p-1.5 rounded">
                              <QrCode className="h-5 w-5" />
                            </div>
                            <span className="font-mono text-sm">{unit.qr_code}</span>
                          </button>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{unit.unit_type}</p>
                            <p className="text-sm text-muted-foreground">
                              {[unit.brand, unit.model].filter(Boolean).join(' ') || 'No brand/model'}
                              {unit.capacity && ` • ${unit.capacity}`}
                            </p>
                            {unit.serial_number && (
                              <p className="text-xs text-muted-foreground font-mono">
                                S/N: {unit.serial_number}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{unit.customer_name}</TableCell>
                        <TableCell>
                          {unit.warranty_expiry_date ? (
                            <div className="flex items-center gap-1.5">
                              <Shield className={`h-4 w-4 ${
                                isWarrantyActive(unit.warranty_expiry_date)
                                  ? 'text-emerald-600'
                                  : 'text-muted-foreground'
                              }`} />
                              <span className={isWarrantyActive(unit.warranty_expiry_date)
                                ? 'text-emerald-600'
                                : 'text-muted-foreground'
                              }>
                                {format(new Date(unit.warranty_expiry_date), 'MMM d, yyyy')}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Wrench className="h-4 w-4 text-muted-foreground" />
                            <span>{unit.total_services}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {unit.last_service_date ? (
                            <div className="flex items-center gap-1.5 text-sm">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {format(new Date(unit.last_service_date), 'MMM d, yyyy')}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">Never</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleShowQR(unit)}
                          >
                            <QrCode className="h-4 w-4 mr-1" />
                            View
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

        {/* QR Code Dialog */}
        <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Unit QR Code</DialogTitle>
              <DialogDescription>
                Scan this code to identify the unit or print for labeling.
              </DialogDescription>
            </DialogHeader>
            {selectedUnit && (
              <div className="flex flex-col items-center py-6 space-y-4">
                <div className="bg-white p-4 rounded-lg border shadow-sm">
                  <QRCodeSVG
                    id="qr-code-svg"
                    value={selectedUnit.qr_code}
                    size={180}
                    level="H"
                    includeMargin
                  />
                </div>
                <div className="text-center space-y-1">
                  <p className="font-mono font-bold text-lg">{selectedUnit.qr_code}</p>
                  <p className="text-sm font-medium">{selectedUnit.unit_type}</p>
                  <p className="text-sm text-muted-foreground">
                    {[selectedUnit.brand, selectedUnit.model].filter(Boolean).join(' ')}
                  </p>
                  <p className="text-sm text-muted-foreground">{selectedUnit.customer_name}</p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setQrDialogOpen(false)}>
                Close
              </Button>
              <Button onClick={handleDownloadQR}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
