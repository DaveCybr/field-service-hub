import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, X, Loader2, Upload } from "lucide-react";

interface PhotoUploadProps {
  serviceId: string;
  photoType: "before" | "after";
  existingPhotos: string[];
  onUploadSuccess: () => void;
  disabled?: boolean;
}

export function PhotoUpload({
  serviceId,
  photoType,
  existingPhotos,
  onUploadSuccess,
  disabled = false,
}: PhotoUploadProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<string[]>(existingPhotos);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploading(true);

      // Upload each file
      const uploadPromises = Array.from(files).map(async (file) => {
        // Validate file
        if (!file.type.startsWith("image/")) {
          throw new Error(`${file.name} is not an image`);
        }

        if (file.size > 5 * 1024 * 1024) {
          // 5MB limit
          throw new Error(`${file.name} is larger than 5MB`);
        }

        // Generate unique filename
        const fileExt = file.name.split(".").pop();
        const fileName = `${serviceId}/${photoType}/${Date.now()}-${Math.random()
          .toString(36)
          .substring(7)}.${fileExt}`;

        // Upload to Supabase Storage
        const { error: uploadError, data } = await supabase.storage
          .from("service-photos")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from("service-photos").getPublicUrl(fileName);

        return publicUrl;
      });

      const uploadedUrls = await Promise.all(uploadPromises);

      // Update database
      const newPhotos = [...photos, ...uploadedUrls];
      const fieldName =
        photoType === "before" ? "before_photos" : "after_photos";

      const { error: updateError } = await supabase
        .from("invoice_services")
        .update({
          [fieldName]: newPhotos,
          updated_at: new Date().toISOString(),
        })
        .eq("id", serviceId);

      if (updateError) throw updateError;

      setPhotos(newPhotos);
      toast({
        title: "Photos Uploaded",
        description: `${uploadedUrls.length} photo(s) uploaded successfully`,
      });

      onUploadSuccess();
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: error.message || "Failed to upload photos",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = async (photoUrl: string) => {
    try {
      // Extract file path from URL
      const urlParts = photoUrl.split("/service-photos/");
      if (urlParts.length < 2) {
        throw new Error("Invalid photo URL");
      }
      const filePath = urlParts[1];

      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from("service-photos")
        .remove([filePath]);

      if (deleteError) throw deleteError;

      // Update database
      const newPhotos = photos.filter((p) => p !== photoUrl);
      const fieldName =
        photoType === "before" ? "before_photos" : "after_photos";

      const { error: updateError } = await supabase
        .from("invoice_services")
        .update({
          [fieldName]: newPhotos,
          updated_at: new Date().toISOString(),
        })
        .eq("id", serviceId);

      if (updateError) throw updateError;

      setPhotos(newPhotos);
      toast({
        title: "Photo Deleted",
        description: "Photo removed successfully",
      });

      onUploadSuccess();
    } catch (error: any) {
      console.error("Delete error:", error);
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: "Failed to delete photo",
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Button */}
      {!disabled && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Camera className="mr-2 h-4 w-4" />
                Upload Photos
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Max 5MB per photo. Supported: JPG, PNG, WebP
          </p>
        </div>
      )}

      {/* Photos Grid */}
      {photos.length === 0 ? (
        <Card className="p-8">
          <div className="text-center text-muted-foreground">
            <Upload className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No {photoType} photos uploaded yet</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {photos.map((photo, index) => (
            <Card key={index} className="relative group overflow-hidden">
              <img
                src={photo}
                alt={`${photoType} photo ${index + 1}`}
                className="w-full aspect-square object-cover"
              />
              {!disabled && (
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleDelete(photo)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
