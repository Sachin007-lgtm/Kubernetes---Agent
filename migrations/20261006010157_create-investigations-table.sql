-- Create investigations table for AI DevOps Kubernetes Agent
CREATE TABLE IF NOT EXISTS public.investigations (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    cluster TEXT NOT NULL,
    namespace TEXT NOT NULL,
    status TEXT NOT NULL,
    root_cause TEXT NOT NULL,
    confidence INT NOT NULL,
    confidence_label TEXT,
    diagnosis JSONB,
    investigation JSONB,
    ai_error TEXT
);

-- Grant privileges to anon and authenticated roles
GRANT ALL ON TABLE public.investigations TO anon, authenticated;

-- Enable Row Level Security (RLS)
ALTER TABLE public.investigations ENABLE ROW LEVEL SECURITY;

-- Allow public read access to past investigations
CREATE POLICY "Allow public read investigations"
ON public.investigations
FOR SELECT
USING (true);

-- Allow public insert access for saving investigations
CREATE POLICY "Allow public insert investigations"
ON public.investigations
FOR INSERT
WITH CHECK (true);

-- Allow public delete access for resetting investigations
CREATE POLICY "Allow public delete investigations"
ON public.investigations
FOR DELETE
USING (true);
