-- Add optional hover background color for sponsor cards.
-- Used behind the color logo variant on hover in public sponsor cards.

alter table public.sponsors
  add column if not exists logo_background_color text;

comment on column public.sponsors.logo_background_color is
  'Optional background color shown on hover behind the sponsor color logo.';
