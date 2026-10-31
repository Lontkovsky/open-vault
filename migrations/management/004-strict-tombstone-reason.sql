DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM polls
    WHERE doc->>'contentStatus'='Removed'
      AND (
        (doc->>'state' IS DISTINCT FROM 'Cancelled' AND doc->>'state' IS DISTINCT FROM 'Invalidated')
        OR doc->>'reason' IS DISTINCT FROM 'LegalContentRemoval'
      )
  ) THEN
    RAISE EXCEPTION 'REMOVED_POLL_REASON_INVALID';
  END IF;
END $$;
