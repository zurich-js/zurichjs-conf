alter table cfp_speakers
  add column if not exists npm_username text;

comment on column cfp_speakers.npm_username is
  'npm registry handle (matches `maintainer:` search). Used to surface the speaker''s open-source footprint on the public profile page.';
