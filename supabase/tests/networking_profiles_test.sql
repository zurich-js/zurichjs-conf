BEGIN;

SELECT plan(15);

INSERT INTO public.tickets (
  id,
  ticket_type,
  ticket_category,
  ticket_stage,
  first_name,
  last_name,
  email,
  stripe_customer_id,
  stripe_session_id,
  amount_paid,
  currency,
  status,
  manage_token_nonce
)
VALUES
  (
    '91000000-0000-4000-8000-000000000001',
    'standard',
    'standard',
    'general_admission',
    'Identity',
    'Fixture',
    'networking-identity@zurichjs.test',
    'cus_networking_test_identity',
    'cs_networking_test_identity',
    29900,
    'CHF',
    'confirmed',
    '92000000-0000-4000-8000-000000000001'
  ),
  (
    '91000000-0000-4000-8000-000000000002',
    'standard',
    'standard',
    'general_admission',
    'Status',
    'Fixture',
    'networking-status@zurichjs.test',
    'cus_networking_test_status',
    'cs_networking_test_status',
    29900,
    'CHF',
    'confirmed',
    '92000000-0000-4000-8000-000000000002'
  ),
  (
    '91000000-0000-4000-8000-000000000003',
    'standard',
    'standard',
    'general_admission',
    'Constraint',
    'Fixture',
    'networking-constraint@zurichjs.test',
    'cus_networking_test_constraint',
    'cs_networking_test_constraint',
    29900,
    'CHF',
    'confirmed',
    '92000000-0000-4000-8000-000000000003'
  );

INSERT INTO public.sponsors (
  id,
  company_name,
  billing_address_street,
  billing_address_city,
  billing_address_postal_code,
  billing_address_country,
  contact_name,
  contact_email
)
VALUES
  (
    '93000000-0000-4000-8000-000000000001',
    'Anon Write Fixture',
    'Teststrasse 1',
    'Zurich',
    '8000',
    'Switzerland',
    'Anon Fixture',
    'networking-anon-sponsor@zurichjs.test'
  ),
  (
    '93000000-0000-4000-8000-000000000002',
    'Constraint Fixture',
    'Teststrasse 2',
    'Zurich',
    '8000',
    'Switzerland',
    'Constraint Fixture',
    'networking-constraint-sponsor@zurichjs.test'
  );

INSERT INTO public.networking_profiles (
  id,
  share_id,
  subject_type,
  ticket_id,
  enabled,
  profile
)
VALUES
  (
    '94000000-0000-4000-8000-000000000001',
    '95000000-0000-4000-8000-000000000001',
    'attendee',
    '91000000-0000-4000-8000-000000000001',
    TRUE,
    '{"githubUrl": "https://github.com/identity-fixture"}'::JSONB
  ),
  (
    '94000000-0000-4000-8000-000000000002',
    '95000000-0000-4000-8000-000000000002',
    'attendee',
    '91000000-0000-4000-8000-000000000002',
    TRUE,
    '{"githubUrl": "https://github.com/status-fixture"}'::JSONB
  );

CREATE FUNCTION pg_temp.anon_networking_insert_is_blocked()
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.networking_profiles (
    id,
    share_id,
    subject_type,
    sponsor_id,
    enabled,
    profile
  )
  VALUES (
    '94000000-0000-4000-8000-000000000003',
    '95000000-0000-4000-8000-000000000003',
    'sponsor',
    '93000000-0000-4000-8000-000000000001',
    TRUE,
    '{"websiteUrl": "https://example.test"}'::JSONB
  );

  RETURN FALSE;
EXCEPTION
  WHEN insufficient_privilege THEN
    RETURN TRUE;
END;
$$;

CREATE FUNCTION pg_temp.failed_check_constraint(statement TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  failed_constraint TEXT;
BEGIN
  EXECUTE statement;
  RETURN NULL;
EXCEPTION
  WHEN check_violation THEN
    GET STACKED DIAGNOSTICS failed_constraint = CONSTRAINT_NAME;
    RETURN failed_constraint;
END;
$$;

SET LOCAL ROLE anon;

SELECT is(
  (
    SELECT count(*)
    FROM public.networking_profiles
    WHERE share_id = '95000000-0000-4000-8000-000000000001'
  ),
  0::BIGINT,
  'anon cannot read networking profiles'
);

SELECT ok(
  pg_temp.anon_networking_insert_is_blocked(),
  'anon cannot write networking profiles'
);

RESET ROLE;
SET LOCAL ROLE service_role;

SELECT is(
  (
    SELECT count(*)
    FROM public.networking_profiles
    WHERE share_id = '95000000-0000-4000-8000-000000000001'
  ),
  1::BIGINT,
  'service_role can read networking profiles'
);

RESET ROLE;

SELECT is(
  pg_temp.failed_check_constraint($statement$
    INSERT INTO public.networking_profiles (
      id,
      share_id,
      subject_type,
      enabled,
      profile
    )
    VALUES (
      '94000000-0000-4000-8000-000000000004',
      '95000000-0000-4000-8000-000000000004',
      'attendee',
      FALSE,
      '{}'::JSONB
    )
  $statement$),
  'networking_profiles_exactly_one_subject',
  'a networking profile without a subject is rejected'
);

SELECT is(
  pg_temp.failed_check_constraint($statement$
    INSERT INTO public.networking_profiles (
      id,
      share_id,
      subject_type,
      ticket_id,
      sponsor_id,
      enabled,
      profile
    )
    VALUES (
      '94000000-0000-4000-8000-000000000005',
      '95000000-0000-4000-8000-000000000005',
      'attendee',
      '91000000-0000-4000-8000-000000000003',
      '93000000-0000-4000-8000-000000000002',
      FALSE,
      '{}'::JSONB
    )
  $statement$),
  'networking_profiles_exactly_one_subject',
  'a networking profile with two subjects is rejected'
);

CREATE TEMP TABLE rpc_upsert_result ON COMMIT DROP AS
SELECT *
FROM public.update_attendee_networking_profile(
  '91000000-0000-4000-8000-000000000001',
  '92000000-0000-4000-8000-000000000001',
  TRUE,
  '{"githubUrl": "https://github.com/updated-fixture"}'::JSONB
);

SELECT is(
  (SELECT result FROM rpc_upsert_result),
  'ok',
  'the attendee networking RPC updates an existing profile'
);

SELECT is(
  (SELECT share_id FROM rpc_upsert_result),
  '95000000-0000-4000-8000-000000000001'::UUID,
  'the attendee networking RPC returns the existing share_id'
);

SELECT is(
  (
    SELECT share_id
    FROM public.networking_profiles
    WHERE ticket_id = '91000000-0000-4000-8000-000000000001'
  ),
  '95000000-0000-4000-8000-000000000001'::UUID,
  'the attendee networking RPC preserves the stored share_id'
);

SELECT is(
  (
    SELECT result
    FROM public.update_attendee_networking_profile(
      '91000000-0000-4000-8000-000000000001',
      '92000000-0000-4000-8000-000000000099',
      FALSE,
      '{}'::JSONB
    )
  ),
  'invalid_token',
  'the attendee networking RPC rejects a stale nonce'
);

UPDATE public.tickets
SET first_name = 'Changed Identity'
WHERE id = '91000000-0000-4000-8000-000000000001';

SELECT isnt(
  (
    SELECT manage_token_nonce
    FROM public.tickets
    WHERE id = '91000000-0000-4000-8000-000000000001'
  ),
  '92000000-0000-4000-8000-000000000001'::UUID,
  'an identity change rotates the ticket manage_token_nonce'
);

SELECT is(
  (
    SELECT count(*)
    FROM public.networking_profiles
    WHERE ticket_id = '91000000-0000-4000-8000-000000000001'
  ),
  0::BIGINT,
  'an identity change deletes the attendee networking profile'
);

UPDATE public.tickets
SET status = 'cancelled'
WHERE id = '91000000-0000-4000-8000-000000000002';

SELECT is(
  (
    SELECT count(*)
    FROM public.networking_profiles
    WHERE ticket_id = '91000000-0000-4000-8000-000000000002'
  ),
  0::BIGINT,
  'confirmed to non-confirmed deletes the attendee networking profile'
);

CREATE TEMP TABLE rpc_disable_result ON COMMIT DROP AS
SELECT *
FROM public.update_attendee_networking_profile(
  '91000000-0000-4000-8000-000000000002',
  '92000000-0000-4000-8000-000000000002',
  FALSE,
  '{"githubUrl": "https://github.com/status-fixture"}'::JSONB
);

SELECT is(
  (SELECT result FROM rpc_disable_result),
  'ok',
  'the attendee networking RPC allows disabling a non-confirmed ticket'
);

SELECT is(
  (
    SELECT enabled
    FROM public.networking_profiles
    WHERE ticket_id = '91000000-0000-4000-8000-000000000002'
  ),
  FALSE,
  'disabling a non-confirmed ticket stores only a disabled profile'
);

SELECT is(
  (
    SELECT result
    FROM public.update_attendee_networking_profile(
      '91000000-0000-4000-8000-000000000002',
      '92000000-0000-4000-8000-000000000002',
      TRUE,
      '{"githubUrl": "https://github.com/status-fixture"}'::JSONB
    )
  ),
  'ticket_not_confirmed',
  'the attendee networking RPC rejects enabling a non-confirmed ticket'
);

SELECT * FROM finish();

ROLLBACK;
