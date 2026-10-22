CREATE TRIGGER booking_confirmation_conflict BEFORE UPDATE OF status, court_key, booking_date, start_minute, end_minute ON bookings
WHEN NEW.status = 'confirmed'
BEGIN
 SELECT RAISE(ABORT, 'BOOKING_CONFLICT') WHERE EXISTS (
  SELECT 1 FROM bookings b WHERE b.id <> NEW.id AND b.status = 'confirmed' AND b.venue_id = NEW.venue_id AND b.court_key = NEW.court_key AND b.booking_date = NEW.booking_date AND b.start_minute < NEW.end_minute AND b.end_minute > NEW.start_minute
 );
END;
--> statement-breakpoint
CREATE TRIGGER booking_confirmation_court BEFORE UPDATE OF status ON bookings
WHEN NEW.status = 'confirmed' AND (NEW.court_key IS NULL OR length(NEW.court_key) = 0)
BEGIN
 SELECT RAISE(ABORT, 'COURT_REQUIRED');
END;
