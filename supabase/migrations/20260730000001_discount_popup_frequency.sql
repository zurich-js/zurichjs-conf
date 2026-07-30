-- Discount popup: show more often for the final sales window.
--
-- The A/B/C popup experiment concluded in favor of the aggressive-20 offer;
-- the client now serves it to everyone and gates the code behind an email.
-- Raise the show probability and shorten the ineligibility cooldown so more
-- of the remaining pre-conference traffic sees the offer. The admin Discount
-- tab still controls these values from here on.

BEGIN;

UPDATE discount_config
SET show_probability = 0.5,
    cooldown_hours = 6;

COMMIT;
