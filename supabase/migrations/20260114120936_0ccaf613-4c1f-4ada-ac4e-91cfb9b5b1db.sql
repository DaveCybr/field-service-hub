-- Create storage bucket for job photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('job-photos', 'job-photos', true);

-- Allow authenticated users to upload photos
CREATE POLICY "Authenticated users can upload job photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'job-photos');

-- Allow authenticated users to view job photos
CREATE POLICY "Anyone can view job photos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'job-photos');

-- Allow authenticated users to delete their uploaded photos
CREATE POLICY "Authenticated users can delete job photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'job-photos');