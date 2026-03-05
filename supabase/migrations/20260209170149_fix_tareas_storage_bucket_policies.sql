/*
  # Fix Storage Bucket Policies for Tareas Files

  1. Changes
    - Drop existing restrictive storage policies that require authenticated users
    - Create new policies that allow anonymous access for all operations
    - This matches the authentication pattern used in the rest of the application

  2. Security
    - Allow anonymous users to perform all CRUD operations on storage objects
    - This is consistent with the custom authentication system used in the admin panel
*/

-- Drop existing storage policies for tareas-files bucket
DROP POLICY IF EXISTS "Authenticated users can upload task files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update task files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete task files" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to task files" ON storage.objects;

-- Create new policies allowing anonymous access
CREATE POLICY "Allow anonymous to upload task files"
  ON storage.objects
  FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'tareas-files');

CREATE POLICY "Allow anonymous to update task files"
  ON storage.objects
  FOR UPDATE
  TO anon
  USING (bucket_id = 'tareas-files')
  WITH CHECK (bucket_id = 'tareas-files');

CREATE POLICY "Allow anonymous to delete task files"
  ON storage.objects
  FOR DELETE
  TO anon
  USING (bucket_id = 'tareas-files');

CREATE POLICY "Allow anonymous to read task files"
  ON storage.objects
  FOR SELECT
  TO anon
  USING (bucket_id = 'tareas-files');