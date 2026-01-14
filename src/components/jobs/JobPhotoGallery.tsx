import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Camera, Upload, X, Loader2, ChevronLeft, ChevronRight, Trash2, Image } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface JobPhotoGalleryProps {
  jobId: string;
  beforePhotos: string[];
  afterPhotos: string[];
  onPhotosUpdated: () => void;
}

export default function JobPhotoGallery({
  jobId,
  beforePhotos,
  afterPhotos,
  onPhotosUpdated,
}: JobPhotoGalleryProps) {
  const { toast } = useToast();
  const beforeInputRef = useRef<HTMLInputElement>(null);
  const afterInputRef = useRef<HTMLInputElement>(null);

  const [uploadingBefore, setUploadingBefore] = useState(false);
  const [uploadingAfter, setUploadingAfter] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [allPhotos, setAllPhotos] = useState<string[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);

  const uploadPhoto = async (
    file: File,
    type: 'before' | 'after'
  ): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${jobId}/${type}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('job-photos')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Upload error:', error);
      throw error;
    }

    const { data: urlData } = supabase.storage
      .from('job-photos')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
    type: 'before' | 'after'
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const setUploading = type === 'before' ? setUploadingBefore : setUploadingAfter;
    setUploading(true);

    try {
      const uploadPromises = Array.from(files).map((file) => uploadPhoto(file, type));
      const urls = await Promise.all(uploadPromises);
      const validUrls = urls.filter((url): url is string => url !== null);

      if (validUrls.length === 0) {
        throw new Error('No files were uploaded successfully');
      }

      // Update the job with new photos
      const currentPhotos = type === 'before' ? beforePhotos : afterPhotos;
      const columnName = type === 'before' ? 'before_photos' : 'after_photos';
      
      const { error } = await supabase
        .from('service_jobs')
        .update({ [columnName]: [...currentPhotos, ...validUrls] })
        .eq('id', jobId);

      if (error) throw error;

      toast({
        title: 'Photos Uploaded',
        description: `${validUrls.length} photo(s) uploaded successfully.`,
      });

      onPhotosUpdated();
    } catch (error: any) {
      console.error('Error uploading photos:', error);
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: error.message || 'Failed to upload photos.',
      });
    } finally {
      setUploading(false);
      // Reset the input
      if (type === 'before' && beforeInputRef.current) {
        beforeInputRef.current.value = '';
      } else if (afterInputRef.current) {
        afterInputRef.current.value = '';
      }
    }
  };

  const handleDeletePhoto = async (photoUrl: string, type: 'before' | 'after') => {
    setDeleting(photoUrl);

    try {
      // Extract the path from the URL
      const urlObj = new URL(photoUrl);
      const pathParts = urlObj.pathname.split('/storage/v1/object/public/job-photos/');
      if (pathParts.length < 2) {
        throw new Error('Invalid photo URL');
      }
      const filePath = decodeURIComponent(pathParts[1]);

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('job-photos')
        .remove([filePath]);

      if (storageError) {
        console.warn('Storage delete warning:', storageError);
      }

      // Update the job to remove the photo
      const currentPhotos = type === 'before' ? beforePhotos : afterPhotos;
      const columnName = type === 'before' ? 'before_photos' : 'after_photos';
      const updatedPhotos = currentPhotos.filter((p) => p !== photoUrl);

      const { error } = await supabase
        .from('service_jobs')
        .update({ [columnName]: updatedPhotos })
        .eq('id', jobId);

      if (error) throw error;

      toast({
        title: 'Photo Deleted',
        description: 'Photo has been removed.',
      });

      // Close gallery if viewing deleted photo
      if (selectedImage === photoUrl) {
        setSelectedImage(null);
      }

      onPhotosUpdated();
    } catch (error: any) {
      console.error('Error deleting photo:', error);
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: error.message || 'Failed to delete photo.',
      });
    } finally {
      setDeleting(null);
    }
  };

  const openImageGallery = (photos: string[], index: number) => {
    setAllPhotos(photos);
    setImageIndex(index);
    setSelectedImage(photos[index]);
  };

  const navigateImage = (direction: 'prev' | 'next') => {
    let newIndex: number;
    if (direction === 'prev') {
      newIndex = imageIndex > 0 ? imageIndex - 1 : allPhotos.length - 1;
    } else {
      newIndex = imageIndex < allPhotos.length - 1 ? imageIndex + 1 : 0;
    }
    setImageIndex(newIndex);
    setSelectedImage(allPhotos[newIndex]);
  };

  const PhotoGrid = ({
    photos,
    type,
    uploading,
    inputRef,
    onFileChange,
  }: {
    photos: string[];
    type: 'before' | 'after';
    uploading: boolean;
    inputRef: React.RefObject<HTMLInputElement>;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  }) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium capitalize">{type} Photos</h4>
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={onFileChange}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => inputRef.current?.click()}
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
                Upload
              </>
            )}
          </Button>
        </div>
      </div>

      {photos.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {photos.map((photo, index) => (
            <div
              key={index}
              className="group relative aspect-square rounded-lg overflow-hidden bg-muted"
            >
              <img
                src={photo}
                alt={`${type} ${index + 1}`}
                className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => openImageGallery(photos, index)}
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeletePhoto(photo, type);
                }}
                disabled={deleting === photo}
              >
                {deleting === photo ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed rounded-lg">
          <Image className="h-10 w-10 text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">No {type} photos uploaded</p>
          <Button
            size="sm"
            variant="ghost"
            className="mt-2"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            <Camera className="mr-2 h-4 w-4" />
            Add Photos
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Photo Gallery
          </CardTitle>
          <CardDescription>
            Upload before and after photos from the service
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <PhotoGrid
            photos={beforePhotos}
            type="before"
            uploading={uploadingBefore}
            inputRef={beforeInputRef as React.RefObject<HTMLInputElement>}
            onFileChange={(e) => handleFileChange(e, 'before')}
          />

          <Separator />

          <PhotoGrid
            photos={afterPhotos}
            type="after"
            uploading={uploadingAfter}
            inputRef={afterInputRef as React.RefObject<HTMLInputElement>}
            onFileChange={(e) => handleFileChange(e, 'after')}
          />
        </CardContent>
      </Card>

      {/* Image Gallery Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>
              Photo {imageIndex + 1} of {allPhotos.length}
            </DialogTitle>
          </DialogHeader>
          <div className="relative">
            {selectedImage && (
              <img
                src={selectedImage}
                alt="Preview"
                className="w-full max-h-[70vh] object-contain bg-black"
              />
            )}

            {allPhotos.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                  onClick={() => navigateImage('prev')}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                  onClick={() => navigateImage('next')}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>
            )}
          </div>
          <div className="p-4 flex justify-center gap-2 overflow-x-auto">
            {allPhotos.map((photo, index) => (
              <button
                key={index}
                className={`h-12 w-12 rounded overflow-hidden flex-shrink-0 ring-2 transition-all ${
                  index === imageIndex
                    ? 'ring-primary'
                    : 'ring-transparent hover:ring-muted-foreground'
                }`}
                onClick={() => {
                  setImageIndex(index);
                  setSelectedImage(photo);
                }}
              >
                <img
                  src={photo}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
