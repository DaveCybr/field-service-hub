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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
      const { data, error } = await supabase
        .from("customers")
        .insert({
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim() || null,
          address: formData.address.trim() || null,
          category: formData.category,
          payment_terms_days: 0,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Pelanggan Berhasil Ditambahkan",
        description: `${data.name} telah berhasil disimpan`,
      });

      onCustomerCreated(data.id, data.name);

      setFormData({
        name: "",
        phone: "",
        email: "",
        address: "",
        payment_terms_days: 0,
        category: "retail",
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error("Error creating customer:", error);
      toast({
        variant: "destructive",
        title: "Gagal Menyimpan",
        description:
          error.message || "Terjadi kesalahan saat menyimpan pelanggan",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
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
            <Label htmlFor="category">Kategori</Label>
            <Select
              value={formData.category}
              onValueChange={(value: any) =>
                setFormData({ ...formData, category: value })
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
              rows={3}
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
