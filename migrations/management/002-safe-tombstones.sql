DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM polls
    WHERE doc->>'contentStatus'='Removed'
      AND doc->>'state' NOT IN ('Cancelled','Invalidated')
  ) THEN
    RAISE EXCEPTION 'REMOVED_POLL_STATE_INVALID';
  END IF;
END $$;

UPDATE polls
SET doc=jsonb_build_object(
  'id', id,
  'state', doc->>'state',
  'contentStatus', 'Removed',
  'reason', 'LegalContentRemoval'
)
WHERE doc->>'contentStatus'='Removed';
