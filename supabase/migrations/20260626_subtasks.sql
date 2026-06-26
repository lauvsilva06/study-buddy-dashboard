-- Add parent_id to topics to support subtasks
ALTER TABLE public.topics
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.topics(id) ON DELETE CASCADE;

-- Index for efficient subtask queries
CREATE INDEX IF NOT EXISTS topics_parent_id_idx ON public.topics(parent_id);
