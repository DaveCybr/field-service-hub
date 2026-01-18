// ProductImageUpload.tsx - Component for uploading product images

import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";

interface ProductImageUploadProps {
  productId: string;
  productName: string;
  currentImageUrl?: string | null;
  onImageUpdate: (imageUrl: string | null) => void;
}

export function ProductImageUpload({
  productId,
  productName,
  currentImageUrl,
  onImageUpdate,
}: ProductImageUploadProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState(currentImageUrl);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith("image/")) {
      toast({
        variant: "destructive",
        title: "Invalid File",
        description: "Please select an image file",
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      // 2MB limit
      toast({
        variant: "destructive",
        title: "File Too Large",
        description: "Image must be less than 2MB",
      });
      return;
    }

    try {
      setUploading(true);

      // Delete old image if exists
      if (imageUrl) {
        const oldPath = imageUrl.split("/product-images/")[1];
        if (oldPath) {
          await supabase.storage.from("product-images").remove([oldPath]);
        }
      }

      // Generate filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${productId}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("product-images").getPublicUrl(fileName);

      // Update product table
      const { error: updateError } = await supabase
        .from("products")
        .update({
          image_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", productId);

      if (updateError) throw updateError;

      setImageUrl(publicUrl);
      onImageUpdate(publicUrl);

      toast({
        title: "Image Uploaded",
        description: "Product image has been updated",
      });
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: error.message || "Failed to upload image",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveImage = async () => {
    if (!imageUrl) return;

    try {
      // Delete from storage
      const imagePath = imageUrl.split("/product-images/")[1];
      if (imagePath) {
        await supabase.storage.from("product-images").remove([imagePath]);
      }

      // Update product table
      const { error } = await supabase
        .from("products")
        .update({
          image_url: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", productId);

      if (error) throw error;

      setImageUrl(null);
      onImageUpdate(null);

      toast({
        title: "Image Removed",
        description: "Product image has been removed",
      });
    } catch (error: any) {
      console.error("Error removing image:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to remove image",
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Image Preview */}
      {imageUrl ? (
        <div className="relative w-full aspect-square rounded-lg border overflow-hidden bg-muted">
          <img
            src={imageUrl}
            alt={productName}
            className="w-full h-full object-cover"
          />
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2"
            onClick={handleRemoveImage}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="w-full aspect-square rounded-lg border-2 border-dashed flex items-center justify-center bg-muted/50">
          <div className="text-center">
            <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
            <p className="mt-2 text-sm text-muted-foreground">No image</p>
          </div>
        </div>
      )}

      {/* Upload Button */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />
        <Button
          variant="outline"
          className="w-full"
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
              <Upload className="mr-2 h-4 w-4" />
              {imageUrl ? "Change Image" : "Upload Image"}
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Max 2MB • JPG, PNG, WebP
        </p>
      </div>
    </div>
  );
}
