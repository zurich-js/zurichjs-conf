-- Add USD to voucher_currency enum for US market support
-- This enables USD pricing for partnership coupons and vouchers

ALTER TYPE voucher_currency ADD VALUE 'USD';
