-- Sprint 28: Allow technik to create proforma faktury for their own zasahy
-- and view proformy linked via zakazka_id (not just protokol_id)

-- Technik can INSERT proforma faktury for zakázky where they have an assigned zásah
CREATE POLICY "Technik can insert proforma"
  ON public.faktury FOR INSERT
  WITH CHECK (
    is_proforma = true
    AND EXISTS (
      SELECT 1 FROM public.zasahy z
      WHERE z.zakazka_id = faktury.zakazka_id
        AND z.technik_id = auth.uid()
        AND z.deleted_at IS NULL
    )
  );

-- Technik can view proformy for their own zakázky (via zasahy)
CREATE POLICY "Technik can view own proformy"
  ON public.faktury FOR SELECT
  USING (
    is_proforma = true
    AND EXISTS (
      SELECT 1 FROM public.zasahy z
      WHERE z.zakazka_id = faktury.zakazka_id
        AND z.technik_id = auth.uid()
        AND z.deleted_at IS NULL
    )
  );
