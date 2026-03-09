-- Sprint 13: Add lat/lng columns to objekty for travel time estimation.
-- Nullable — geocoded on demand from address.

ALTER TABLE public.objekty
  ADD COLUMN lat DOUBLE PRECISION DEFAULT NULL,
  ADD COLUMN lng DOUBLE PRECISION DEFAULT NULL;

-- Index for spatial queries (simple btree is fine for basic lookups)
CREATE INDEX idx_objekty_lat_lng ON public.objekty (lat, lng)
  WHERE lat IS NOT NULL AND lng IS NOT NULL AND deleted_at IS NULL;

COMMENT ON COLUMN public.objekty.lat IS 'Zeměpisná šířka (geocodováno z adresy)';
COMMENT ON COLUMN public.objekty.lng IS 'Zeměpisná délka (geocodováno z adresy)';
