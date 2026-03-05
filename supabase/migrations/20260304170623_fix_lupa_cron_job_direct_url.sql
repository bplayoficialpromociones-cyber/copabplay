/*
  # Arreglar cron job de La Lupa con URL directa

  Reemplaza el cron job anterior por uno que usa la URL hardcodeada
  de Supabase directamente, sin depender de app settings.
*/

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'lupa-fetch-news-cron') THEN
    PERFORM cron.unschedule('lupa-fetch-news-cron');
  END IF;
END $$;

SELECT cron.schedule(
  'lupa-fetch-news-cron',
  '0 */4 * * *',
  $$
  SELECT status FROM http((
    'POST',
    'https://yddjmnbvshkkkvqrbqzy.supabase.co/functions/v1/lupa-fetch-news',
    ARRAY[
      http_header('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkZGptbmJ2c2hra2t2cXJicXp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1MTAxNTcsImV4cCI6MjA4MjA4NjE1N30.55L_q_Krc3Jk9D5RCrq9oQeb5NVJNtokP-U-taUfnqQ'),
      http_header('Content-Type', 'application/json')
    ],
    'application/json',
    '{}'
  )::http_request);
  $$
);
