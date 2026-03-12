-- Sprint 22: Create storage bucket for generated protocol PDFs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'protokoly-pdf',
  'protokoly-pdf',
  true,
  10485760, -- 10MB
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for protokoly-pdf bucket
-- Authenticated users can read (needed for download links)
CREATE POLICY "Authenticated users can read protocol PDFs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'protokoly-pdf');

-- Only admins and the protocol's technik can upload
CREATE POLICY "Admins can upload protocol PDFs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'protokoly-pdf'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role::text[] && ARRAY['admin', 'super_admin']::text[]
    )
  );

-- Admins can delete PDFs
CREATE POLICY "Admins can delete protocol PDFs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'protokoly-pdf'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role::text[] && ARRAY['admin', 'super_admin']::text[]
    )
  );
