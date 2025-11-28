-- Fix existing accepted orders that don't have accepted_at timestamp
-- This sets accepted_at to created_at for orders that are already accepted but missing the timestamp

UPDATE tblorder
SET accepted_at = created_at
WHERE order_status = 'accepted' 
  AND accepted_at IS NULL;

-- Verify the update
SELECT id, order_status, created_at, accepted_at, updated_at
FROM tblorder
WHERE order_status = 'accepted'
ORDER BY id DESC
LIMIT 10;
