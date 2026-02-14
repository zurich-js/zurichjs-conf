revoke delete on table "public"."cfp_reviewers" from "anon";

revoke insert on table "public"."cfp_reviewers" from "anon";

revoke references on table "public"."cfp_reviewers" from "anon";

revoke select on table "public"."cfp_reviewers" from "anon";

revoke trigger on table "public"."cfp_reviewers" from "anon";

revoke truncate on table "public"."cfp_reviewers" from "anon";

revoke update on table "public"."cfp_reviewers" from "anon";

revoke delete on table "public"."cfp_speakers" from "anon";

revoke insert on table "public"."cfp_speakers" from "anon";

revoke references on table "public"."cfp_speakers" from "anon";

revoke select on table "public"."cfp_speakers" from "anon";

revoke trigger on table "public"."cfp_speakers" from "anon";

revoke truncate on table "public"."cfp_speakers" from "anon";

revoke update on table "public"."cfp_speakers" from "anon";

revoke delete on table "public"."cfp_submissions" from "anon";

revoke insert on table "public"."cfp_submissions" from "anon";

revoke references on table "public"."cfp_submissions" from "anon";

revoke select on table "public"."cfp_submissions" from "anon";

revoke trigger on table "public"."cfp_submissions" from "anon";

revoke truncate on table "public"."cfp_submissions" from "anon";

revoke update on table "public"."cfp_submissions" from "anon";

revoke delete on table "public"."workshops" from "anon";

revoke insert on table "public"."workshops" from "anon";

revoke references on table "public"."workshops" from "anon";

revoke select on table "public"."workshops" from "anon";

revoke trigger on table "public"."workshops" from "anon";

revoke truncate on table "public"."workshops" from "anon";

revoke update on table "public"."workshops" from "anon";

alter table "public"."b2b_invoice_attendees" enable row level security;

alter table "public"."b2b_invoices" enable row level security;

alter table "public"."cfp_config" enable row level security;

alter table "public"."cfp_speaker_accommodation" enable row level security;

alter table "public"."cfp_speaker_flights" enable row level security;

alter table "public"."cfp_speaker_reimbursements" enable row level security;

alter table "public"."cfp_speaker_travel" enable row level security;

alter table "public"."cfp_speakers" enable row level security;

alter table "public"."cfp_submission_tags" enable row level security;

alter table "public"."cfp_submissions" enable row level security;

alter table "public"."cfp_tags" enable row level security;

alter table "public"."partnership_coupons" enable row level security;

alter table "public"."partnership_emails" enable row level security;

alter table "public"."partnership_vouchers" enable row level security;

alter table "public"."partnerships" enable row level security;

alter table "public"."profiles" enable row level security;

alter table "public"."ticket_upgrades" enable row level security;

alter table "public"."workshop_registrations" enable row level security;

alter table "public"."workshops" enable row level security;

grant select on table "public"."cfp_submission_tags" to "authenticator";


create policy "cfp_speakers_insert_own"
  on "public"."cfp_speakers"
  as permissive
  for insert
  to authenticated, authenticator
with check ((( SELECT auth.uid() AS uid) = user_id));



create policy "cfp_speakers_select_own"
  on "public"."cfp_speakers"
  as permissive
  for select
  to authenticated, authenticator
using ((( SELECT auth.uid() AS uid) = user_id));



create policy "cfp_speakers_update_own"
  on "public"."cfp_speakers"
  as permissive
  for update
  to authenticated, authenticator
using ((( SELECT auth.uid() AS uid) = user_id))
with check ((( SELECT auth.uid() AS uid) = user_id));



create policy "cfp_submission_tags_read"
  on "public"."cfp_submission_tags"
  as permissive
  for select
  to authenticated, authenticator
using (true);



create policy "cfp_select_own"
  on "public"."cfp_submissions"
  as permissive
  for select
  to authenticated, authenticator
using ((( SELECT auth.uid() AS uid) = speaker_id));



create policy "cfp_update_own"
  on "public"."cfp_submissions"
  as permissive
  for update
  to authenticated, authenticator
using ((( SELECT auth.uid() AS uid) = speaker_id))
with check ((( SELECT auth.uid() AS uid) = speaker_id));



create policy "cfp_tags_public_read"
  on "public"."cfp_tags"
  as permissive
  for select
  to authenticated, authenticator
using (true);



create policy "profiles_insert_self"
  on "public"."profiles"
  as permissive
  for insert
  to authenticated
with check ((id = ( SELECT auth.uid() AS uid)));



create policy "profiles_select_own"
  on "public"."profiles"
  as permissive
  for select
  to authenticated
using ((id = ( SELECT auth.uid() AS uid)));

