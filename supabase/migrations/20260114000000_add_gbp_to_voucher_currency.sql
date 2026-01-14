-- Add GBP to voucher_currency enum for UK market support
-- This enables GBP pricing for partnership coupons and vouchers

ALTER TYPE voucher_currency ADD VALUE 'GBP';
