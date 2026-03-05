/*
  # Crear cron job para La Lupa de Tobi

  Crea un job programado que ejecuta el fetch de noticias cada 4 horas.
  Schedule: 0h, 4h, 8h, 12h, 16h, 20h UTC.
*/

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS http;

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
    current_setting('app.supabase_url') || '/functions/v1/lupa-fetch-news',
    ARRAY[http_header('Authorization', 'Bearer ' || current_setting('app.supabase_anon_key'))],
    'application/json',
    '{}'
  )::http_request);
  $$
);
