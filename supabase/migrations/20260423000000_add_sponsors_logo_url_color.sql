-- Add optional hover color logo URL for sponsors.
-- Used by public sponsor cards for color-on-hover display.

alter table public.sponsors
  add column if not exists logo_url_color text;

comment on column public.sponsors.logo_url_color is
  'Optional color logo URL shown on hover in public sponsor cards.';
