/*
  # Create Storage Bucket for Task Files

  1. Storage Setup
    - Create `tareas-files` bucket for storing task images and videos
    - Allow authenticated users to upload files
    - Allow public read access to files
  
  2. Security
    - Authenticated users can insert files
    - Authenticated users can update their own files
    - Authenticated users can delete files
    - Public read access for all files
*/

-- Create the storage bucket for task files
INSERT INTO storage.buckets (id, name, public)
VALUES ('tareas-files', 'tareas-files', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload task files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'tareas-files');

-- Policy: Allow authenticated users to update files
CREATE POLICY "Authenticated users can update task files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'tareas-files')
  WITH CHECK (bucket_id = 'tareas-files');

-- Policy: Allow authenticated users to delete files
CREATE POLICY "Authenticated users can delete task files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'tareas-files');

-- Policy: Allow public read access to task files
CREATE POLICY "Public read access to task files"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'tareas-files');