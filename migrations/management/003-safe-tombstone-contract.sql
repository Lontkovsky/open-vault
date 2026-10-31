DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM polls
    WHERE doc->>'contentStatus'='Removed'
      AND (
        doc->>'state' NOT IN ('Cancelled','Invalidated')
        OR doc->>'reason' <> 'LegalContentRemoval'
      )
  ) THEN
    RAISE EXCEPTION 'REMOVED_POLL_CONTRACT_INVALID';
  END IF;
END $$;
