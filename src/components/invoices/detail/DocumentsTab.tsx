// DocumentsTab.tsx
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Image as ImageIcon,
  File,
  Loader2,
  Eye,
} from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import type { Invoice } from "@/hooks/invoices/useInvoiceDetail";

interface Document {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  uploaded_at: string;
}

export function DocumentsTab({ invoice }: { invoice: Invoice }) {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, [invoice.id]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from("invoices")
        .list(`documents/${invoice.id}/`, {
          sortBy: { column: "created_at", order: "desc" },
        });
      if (error) throw error;

      setDocuments(
        (data || []).map((file) => ({
          id: file.id,
          name: file.name,
          url: supabase.storage
            .from("invoices")
            .getPublicUrl(`documents/${invoice.id}/${file.name}`).data
            .publicUrl,
          size: file.metadata?.size || 0,
          type: file.metadata?.mimetype || "unknown",
          uploaded_at: file.created_at,
        })),
      );
    } catch (error: any) {
      console.error("Error fetching documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { error } = await supabase.storage
        .from("invoices")
        .upload(`documents/${invoice.id}/${Date.now()}-${file.name}`, file);
      if (error) throw error;
      toast({ title: "Berhasil", description: "Dokumen berhasil diunggah" });
      await fetchDocuments();
      e.target.value = "";
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Gagal Mengunggah",
        description: error.message,
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (path: string) => {
    try {
      const { error } = await supabase.storage.from("invoices").remove([path]);
      if (error) throw error;
      toast({ title: "Dihapus", description: "Dokumen berhasil dihapus" });
      await fetchDocuments();
    } catch {
      toast({
        variant: "destructive",
        title: "Gagal",
        description: "Gagal menghapus dokumen",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Unggah Dokumen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="file">Pilih File</Label>
              <Input
                id="file"
                type="file"
                onChange={handleUpload}
                disabled={uploading}
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
              />
            </div>
            {uploading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Mengunggah...
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Dokumen ({documents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Belum ada dokumen yang diunggah</p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50"
                >
                  <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center shrink-0">
                    {doc.type.startsWith("image/") ? (
                      <ImageIcon className="h-5 w-5" />
                    ) : (
                      <File className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{doc.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(doc.size)} •{" "}
                      {format(new Date(doc.uploaded_at), "dd MMM yyyy", {
                        locale: localeId,
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(doc.url, "_blank")}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const a = document.createElement("a");
                        a.href = doc.url;
                        a.download = doc.name;
                        a.click();
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        handleDelete(`documents/${invoice.id}/${doc.name}`)
                      }
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
