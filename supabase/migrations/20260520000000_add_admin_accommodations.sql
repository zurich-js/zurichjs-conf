-- Generic accommodation tracking for the admin travel dashboard.
-- These tables are deliberately not CFP-prefixed: accommodations can cover
-- speakers, partners, buyers, staff, family members, and other guests.

CREATE TABLE IF NOT EXISTS hotels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hotel_room_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  default_nightly_rate INTEGER CHECK (default_nightly_rate IS NULL OR default_nightly_rate >= 0),
  default_occupancy INTEGER CHECK (default_occupancy IS NULL OR default_occupancy >= 1),
  max_occupancy INTEGER CHECK (max_occupancy IS NULL OR max_occupancy >= 1),
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS accommodation_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_group_id UUID NOT NULL DEFAULT gen_random_uuid(),
  related_speaker_id UUID REFERENCES cfp_speakers(id) ON DELETE SET NULL,
  guest_name TEXT NOT NULL,
  guest_email TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'pending_details', 'pending_payment', 'confirmed', 'canceled')
  ),
  reservation_number TEXT,
  reservation_confirmation_url TEXT,
  conference_amount INTEGER NOT NULL DEFAULT 0 CHECK (conference_amount >= 0),
  guest_amount INTEGER NOT NULL DEFAULT 0 CHECK (guest_amount >= 0),
  admin_notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS accommodation_booking_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES accommodation_bookings(id) ON DELETE CASCADE,
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE RESTRICT,
  room_type_id UUID REFERENCES hotel_room_types(id) ON DELETE SET NULL,
  room_name TEXT NOT NULL,
  people_count INTEGER NOT NULL DEFAULT 1 CHECK (people_count >= 1),
  check_in_date DATE,
  check_out_date DATE,
  nightly_rate INTEGER NOT NULL DEFAULT 0 CHECK (nightly_rate >= 0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE hotels IS 'Reusable hotel catalog for admin accommodation tracking';
COMMENT ON TABLE hotel_room_types IS 'Reusable hotel room type defaults for admin accommodation tracking';
COMMENT ON TABLE accommodation_bookings IS 'Admin-managed accommodation bookings for speakers and non-speaker guests';
COMMENT ON TABLE accommodation_booking_rooms IS 'Room lines within an accommodation booking';

CREATE INDEX IF NOT EXISTS idx_hotels_active ON hotels(is_active);
CREATE INDEX IF NOT EXISTS idx_hotel_room_types_hotel ON hotel_room_types(hotel_id);
CREATE INDEX IF NOT EXISTS idx_hotel_room_types_active ON hotel_room_types(is_active);
CREATE INDEX IF NOT EXISTS idx_accommodation_bookings_group ON accommodation_bookings(booking_group_id);
CREATE INDEX IF NOT EXISTS idx_accommodation_bookings_related_speaker ON accommodation_bookings(related_speaker_id);
CREATE INDEX IF NOT EXISTS idx_accommodation_bookings_status ON accommodation_bookings(status);
CREATE INDEX IF NOT EXISTS idx_accommodation_booking_rooms_booking ON accommodation_booking_rooms(booking_id);
CREATE INDEX IF NOT EXISTS idx_accommodation_booking_rooms_hotel ON accommodation_booking_rooms(hotel_id);
CREATE INDEX IF NOT EXISTS idx_accommodation_booking_rooms_check_in ON accommodation_booking_rooms(check_in_date);
CREATE INDEX IF NOT EXISTS idx_accommodation_booking_rooms_check_out ON accommodation_booking_rooms(check_out_date);

CREATE TRIGGER update_hotels_updated_at BEFORE UPDATE ON hotels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hotel_room_types_updated_at BEFORE UPDATE ON hotel_room_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accommodation_bookings_updated_at BEFORE UPDATE ON accommodation_bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accommodation_booking_rooms_updated_at BEFORE UPDATE ON accommodation_booking_rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
