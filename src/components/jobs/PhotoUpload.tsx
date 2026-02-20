import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Camera, X, Upload, Loader2, Image as ImageIcon } from "lucide-react";

interface PhotoUploadProps {
  jobId: string;
  type: "before" | "after";
  onPhotosChange: (urls: string[]) => void;
  existingPhotos?: string[];
  disabled?: boolean;
  maxPhotos?: number;
}

export default function PhotoUpload({
  jobId,
  type,
  onPhotosChange,
  existingPhotos = [],
  disabled = false,
  maxPhotos = 5,
}: PhotoUploadProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<string[]>(existingPhotos);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const typeLabel = type === "before" ? "Sebelum" : "Sesudah";

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = maxPhotos - photos.length;
    if (remainingSlots <= 0) {
      toast({
        variant: "destructive",
        title: "Batas foto tercapai",
        description: `Anda hanya dapat mengupload maksimal ${maxPhotos} foto.`,
      });
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    setUploading(true);
    setUploadProgress(0);

    try {
      const uploadedUrls: string[] = [];

      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];

        // Validasi tipe file
        if (!file.type.startsWith("image/")) {
          toast({
            variant: "destructive",
            title: "Tipe file tidak valid",
            description: "Harap upload hanya file gambar.",
          });
          continue;
        }

        // Validasi ukuran file (maks 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast({
            variant: "destructive",
            title: "File terlalu besar",
            description: "Ukuran file maksimal adalah 5MB.",
          });
          continue;
        }

        // Buat nama file unik
        const fileExt = file.name.split(".").pop();
        const fileName = `${jobId}/${type}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        // Upload ke Supabase Storage
        const { data, error } = await supabase.storage
          .from("job-photos")
          .upload(fileName, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (error) {
          console.error("Error upload:", error);
          throw error;
        }

        // Dapatkan URL publik
        const { data: urlData } = supabase.storage
          .from("job-photos")
          .getPublicUrl(data.path);

        uploadedUrls.push(urlData.publicUrl);
        setUploadProgress(Math.round(((i + 1) / filesToUpload.length) * 100));
      }

      const newPhotos = [...photos, ...uploadedUrls];
      setPhotos(newPhotos);
      onPhotosChange(newPhotos);

      toast({
        title: "Foto diupload",
        description: `${uploadedUrls.length} foto berhasil diupload.`,
      });
    } catch (error) {
      console.error("Error mengupload foto:", error);
      toast({
        variant: "destructive",
        title: "Upload gagal",
        description: "Gagal mengupload foto. Silakan coba lagi.",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    setPhotos(newPhotos);
    onPhotosChange(newPhotos);
  };

  const openCamera = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Foto {typeLabel}</label>
        <span className="text-xs text-muted-foreground">
          {photos.length}/{maxPhotos}
        </span>
      </div>

      {/* Grid Foto */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((url, index) => (
            <div
              key={index}
              className="relative aspect-square rounded-lg overflow-hidden group"
            >
              <img
                src={url}
                alt={`Foto ${typeLabel.toLowerCase()} ${index + 1}`}
                className="w-full h-full object-cover"
              />
              {!disabled && (
                <button
                  onClick={() => removePhoto(index)}
                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tombol Upload */}
      {!disabled && photos.length < maxPhotos && (
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openCamera}
            disabled={uploading}
            className="flex-1"
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Mengupload {uploadProgress}%
              </>
            ) : (
              <>
                <Camera className="mr-2 h-4 w-4" />
                Ambil Foto
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.removeAttribute("capture");
                fileInputRef.current.click();
                setTimeout(() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.setAttribute("capture", "environment");
                  }
                }, 100);
              }
            }}
            disabled={uploading}
            className="flex-1"
          >
            <Upload className="mr-2 h-4 w-4" />
            Galeri
          </Button>
        </div>
      )}

      {/* Kondisi Kosong */}
      {photos.length === 0 && !uploading && (
        <div className="border-2 border-dashed rounded-lg p-4 text-center text-muted-foreground">
          <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Belum ada foto</p>
          <p className="text-xs">
            Ambil atau upload foto untuk mendokumentasikan pekerjaan
          </p>
        </div>
      )}
    </div>
  );
}
