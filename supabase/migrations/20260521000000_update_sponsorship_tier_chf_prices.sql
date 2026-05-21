BEGIN;

UPDATE sponsorship_tiers
SET
  price_chf = updates.price_chf,
  addon_credit_chf = updates.addon_credit_chf,
  updated_at = NOW()
FROM (
  VALUES
    ('diamond', 1500000, 500000),
    ('platinum', 1100000, 400000),
    ('gold', 850000, 250000),
    ('silver', 600000, 150000),
    ('bronze', 300000, 100000),
    ('supporter', 120000, 0)
) AS updates(id, price_chf, addon_credit_chf)
WHERE sponsorship_tiers.id = updates.id;

COMMIT;
