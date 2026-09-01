-- Aggregate for the live door dashboard.
--
-- WHY A FUNCTION RATHER THAN QUERIES FROM THE CLIENT
-- The dashboard polls. Every design choice here exists to make one poll cheap,
-- because the alternative is genuinely worse than the whole station fleet: at a
-- 10-second interval a single viewer issues 720 requests over a two-hour door,
-- and if each one shipped door_events rows to the browser to be grouped in
-- JavaScript that is megabytes of attendee-adjacent data per viewer per day.
--
-- This returns one small jsonb object in one round trip. Per-station and
-- per-volunteer grouping happens in Postgres, where it is an index scan, and the
-- payload is a fixed few hundred bytes regardless of how busy the door is.
--
-- It reads only counts and timestamps. No attendee names or emails cross this
-- boundary, so a dashboard left open on a laptop at the registration desk is not
-- a PII exposure.

BEGIN;

CREATE OR REPLACE FUNCTION public.door_dashboard(p_occasion TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_occasion TEXT := COALESCE(p_occasion, public.door_current_occasion());
  v_expected INT;
  v_arrived  INT;
  v_result   JSONB;
BEGIN
  -- Everyone who could turn up for this occasion.
  --   workshop_day: confirmed workshop seats, INCLUDING attendees with no
  --                 conference ticket at all.
  --   conference_day: confirmed conference tickets.
  IF v_occasion = 'workshop_day' THEN
    SELECT count(*) INTO v_expected
      FROM public.workshop_registrations WHERE status = 'confirmed';
    SELECT count(*) INTO v_arrived
      FROM public.workshop_registrations WHERE status = 'confirmed' AND checked_in;
  ELSE
    SELECT count(*) INTO v_expected
      FROM public.tickets WHERE status = 'confirmed';
    SELECT count(*) INTO v_arrived
      FROM public.tickets
      WHERE status = 'confirmed' AND checked_in_conference_day_at IS NOT NULL;
  END IF;

  SELECT jsonb_build_object(
    'occasion', v_occasion,
    'generatedAt', NOW(),

    'expected', v_expected,
    'arrived', v_arrived,
    'remaining', GREATEST(v_expected - v_arrived, 0),

    -- Goodie bags are only meaningful on the day tickets are entitled to them.
    'goodieHandedOver', (
      SELECT count(*) FROM public.tickets
      WHERE status = 'confirmed' AND goodie_handed_at IS NOT NULL
    ),

    -- Throughput over the last quarter hour, which is what tells a lead whether
    -- the queue is moving right now rather than how the morning went overall.
    'arrivalsLast15Min', (
      SELECT count(*) FROM public.door_events
      WHERE occasion = v_occasion
        AND event_type IN ('checked_in', 'manual_admit')
        AND outcome = 'applied'
        AND recorded_at > NOW() - INTERVAL '15 minutes'
    ),
    'arrivalsLast5Min', (
      SELECT count(*) FROM public.door_events
      WHERE occasion = v_occasion
        AND event_type IN ('checked_in', 'manual_admit')
        AND outcome = 'applied'
        AND recorded_at > NOW() - INTERVAL '5 minutes'
    ),

    -- Per station, so a lead can see a lane that has gone quiet. lastSeenAt is
    -- the signal that matters: a station with a recent action is working, one
    -- that has been silent for ten minutes may have a dead battery.
    'stations', COALESCE((
      SELECT jsonb_agg(s ORDER BY s->>'station')
      FROM (
        SELECT jsonb_build_object(
          'station', COALESCE(station, 'unlabelled'),
          'admitted', count(*) FILTER (
            WHERE event_type IN ('checked_in', 'manual_admit') AND outcome = 'applied'
          ),
          'duplicates', count(*) FILTER (WHERE outcome = 'duplicate'),
          'refusals', count(*) FILTER (WHERE outcome IN ('denied', 'not_found')),
          'lastSeenAt', max(recorded_at)
        ) AS s
        FROM public.door_events
        WHERE occasion = v_occasion
        GROUP BY COALESCE(station, 'unlabelled')
      ) grouped
    ), '[]'::jsonb),

    -- Per volunteer. Deliberately name and role only, never their own contact
    -- details, and the counts exist to spot someone who needs help rather than
    -- to rank anyone.
    'volunteers', COALESCE((
      SELECT jsonb_agg(v ORDER BY (v->>'admitted')::int DESC)
      FROM (
        SELECT jsonb_build_object(
          'staffEmail', staff_email,
          'staffRole', staff_role,
          'admitted', count(*) FILTER (
            WHERE event_type IN ('checked_in', 'manual_admit') AND outcome = 'applied'
          ),
          'manualAdmits', count(*) FILTER (WHERE event_type = 'manual_admit'),
          'refusals', count(*) FILTER (WHERE outcome IN ('denied', 'not_found')),
          'lastSeenAt', max(recorded_at)
        ) AS v
        FROM public.door_events
        WHERE occasion = v_occasion
        GROUP BY staff_email, staff_role
      ) grouped
    ), '[]'::jsonb),

    -- Things a lead should look at. Not errors -- signals.
    --   refusals: a run of these can mean a broken batch of codes.
    --   manualAdmits: expected because blank badges have no code, but a spike
    --                 at one station can mean that station's camera is failing.
    --   notFound: someone scanning codes from a different event.
    'anomalies', jsonb_build_object(
      'refusals', (
        SELECT count(*) FROM public.door_events
        WHERE occasion = v_occasion AND outcome = 'denied'
      ),
      'notFound', (
        SELECT count(*) FROM public.door_events
        WHERE occasion = v_occasion AND outcome = 'not_found'
      ),
      'manualAdmits', (
        SELECT count(*) FROM public.door_events
        WHERE occasion = v_occasion AND event_type = 'manual_admit' AND outcome = 'applied'
      ),
      'duplicates', (
        SELECT count(*) FROM public.door_events
        WHERE occasion = v_occasion AND outcome = 'duplicate'
      )
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.door_dashboard(TEXT) IS 'One small aggregate for the polled live dashboard. Grouping happens in Postgres so a poll costs one round trip and a fixed payload, and no attendee names or emails cross the boundary.';

-- Same least-privilege treatment as the other door functions: revoking from
-- PUBLIC alone would leave the direct grants Supabase makes to anon and
-- authenticated in place.
REVOKE ALL ON FUNCTION public.door_dashboard(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.door_dashboard(TEXT) TO service_role;

-- Supports every recorded_at window above.
CREATE INDEX IF NOT EXISTS idx_door_events_occasion_recorded
  ON public.door_events (occasion, recorded_at DESC);

COMMIT;
