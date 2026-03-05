/*
  # Enable Realtime on Tareas Table

  1. Changes
    - Enable Realtime replication for the `tareas` table
    - This allows real-time subscriptions to INSERT, UPDATE, and DELETE events

  2. Important Notes
    - This is CRITICAL for the real-time synchronization of task grids across multiple user sessions
    - Without this, Realtime subscriptions in the frontend will not receive database change events
*/

-- Enable Realtime for the tareas table
ALTER PUBLICATION supabase_realtime ADD TABLE tareas;
