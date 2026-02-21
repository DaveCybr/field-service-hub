import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus } from "lucide-react";
import { CustomerLocationPicker } from "@/components/customers/CustomerLocationPicker";

interface CustomerQuickCreateProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCustomerCreated: (customerId: string, customerName: string) => void;
}

export function CustomerQuickCreate({
  open,
  onOpenChange,
  onCustomerCreated,
}: CustomerQuickCreateProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    category: "retail" as "retail" | "project",
    payment_terms_days: 0,
  });

  // GPS state terpisah — opsional, bisa diisi nanti di halaman Customer
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      email: "",
      address: "",
      payment_terms_days: 0,
      category: "retail",
    });
    setLatitude(null);
    setLongitude(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // ✅ Cegah bubble ke form parent NewInvoice

    if (!formData.name.trim()) {
      toast({
        variant: "destructive",
        title: "Nama Wajib Diisi",
        description: "Nama pelanggan tidak boleh kosong",
      });
      return;
    }
    if (!formData.phone.trim()) {
      toast({
        variant: "destructive",
        title: "Nomor Telepon Wajib Diisi",
        description: "Nomor telepon tidak boleh kosong",
      });
      return;
    }

    setSubmitting(true);
    try {
      // ✅ Pisah insert dan select agar RLS error tidak muncul palsu
      const { error: insertError } = await supabase.from("customers").insert({
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || null,
        address: formData.address.trim() || null,
        category: formData.category,
        payment_terms_days: 0,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
      });

      if (insertError) throw insertError;

      const { data, error: selectError } = await supabase
        .from("customers")
        .select("id, name")
        .eq("name", formData.name.trim())
        .eq("phone", formData.phone.trim())
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (selectError) throw selectError;

      onOpenChange(false);
      resetForm();
      onCustomerCreated(data.id, data.name);

      toast({
        title: "Pelanggan Berhasil Ditambahkan",
        description: latitude
          ? `${data.name} ditambahkan dengan lokasi GPS`
          : `${data.name} ditambahkan. Lokasi GPS bisa diatur nanti di halaman Pelanggan.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Gagal Menyimpan",
        description: error.message || "Terjadi kesalahan",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tambah Pelanggan Baru</DialogTitle>
          <DialogDescription>
            Tambahkan pelanggan baru dengan cepat. Detail lengkap dapat diubah
            nanti.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Nama Pelanggan <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Masukkan nama pelanggan"
              autoFocus
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">
              Nomor Telepon <span className="text-destructive">*</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              placeholder="Contoh: 0812-3456-7890"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Kategori</Label>
            <Select
              value={formData.category}
              onValueChange={(v: any) =>
                setFormData({ ...formData, category: v })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="retail">Retail</SelectItem>
                <SelectItem value="project">Proyek</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email (Opsional)</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              placeholder="pelanggan@contoh.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Alamat (Opsional)</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              placeholder="Alamat pelanggan..."
              rows={2}
            />
          </div>

          {/* Lokasi GPS — opsional, auto-fill ke semua service saat buat invoice */}
          <div className="space-y-2">
            <Label>
              Lokasi GPS{" "}
              <span className="text-muted-foreground font-normal text-xs">
                (Opsional — untuk validasi check-in teknisi)
              </span>
            </Label>
            <CustomerLocationPicker
              latitude={latitude}
              longitude={longitude}
              address={formData.address}
              onLocationChange={(lat, lng) => {
                setLatitude(lat);
                setLongitude(lng);
              }}
              onAddressChange={(addr) =>
                setFormData({ ...formData, address: addr })
              }
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Batal
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Tambah Pelanggan
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
