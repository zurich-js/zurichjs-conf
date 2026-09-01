BEGIN;

ALTER TABLE public.manual_badge_entries
  DROP CONSTRAINT IF EXISTS manual_badge_entries_first_name_check;

ALTER TABLE public.manual_badge_entries
  ADD CONSTRAINT manual_badge_entries_first_name_check CHECK (
    length(trim(first_name)) <= 120
    AND (
      category IN ('sponsor', 'organizer')
      OR length(trim(first_name)) >= 1
    )
  );

COMMIT;
