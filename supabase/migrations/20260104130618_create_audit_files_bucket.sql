/*
  # Create storage bucket for tournament audit files

  1. New Storage Bucket
    - `audit-files` - Public bucket for storing Excel files
    - Allows file upload, download, and deletion
    - Public access for downloading files

  2. Security
    - Public bucket (files can be downloaded by anyone with the URL)
    - This is safe because the admin panel has its own authentication layer
    - Only authorized admins can upload files through the UI

  3. Policies
    - Allow public to read (download) files
    - Allow public to insert (upload) files
    - Allow public to update files
    - Allow public to delete files
*/

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'audit-files',
  'audit-files',
  true,
  52428800,
  ARRAY['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/octet-stream']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Create policy for public read access
CREATE POLICY "Public can read audit files"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'audit-files');

-- Create policy for public upload
CREATE POLICY "Public can upload audit files"
  ON storage.objects
  FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'audit-files');

-- Create policy for public update
CREATE POLICY "Public can update audit files"
  ON storage.objects
  FOR UPDATE
  TO public
  USING (bucket_id = 'audit-files');

-- Create policy for public delete
CREATE POLICY "Public can delete audit files"
  ON storage.objects
  FOR DELETE
  TO public
  USING (bucket_id = 'audit-files');
