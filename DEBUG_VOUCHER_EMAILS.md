# Debugging Voucher Emails

## Steps to Debug

### 1. Check Your Server Logs

After making a test purchase with vouchers, check your server logs for these key messages:

```
[WebhookHandler] ====== Categorizing line items ======
[WebhookHandler] Processing line item 1/2:
[WebhookHandler] isWorkshopVoucher: checking price
[WebhookHandler] ✅ Categorized as: WORKSHOP VOUCHER
```

### 2. Look for These Specific Log Sections

**Line Item Detection:**
- Look for `[WebhookHandler] isWorkshopVoucher: checking price`
- Check if `productId` matches `expectedProductId`
- Verify categorization shows "WORKSHOP VOUCHER" or "TICKET"

**Voucher Processing:**
- Look for `[WebhookHandler] ====== Processing workshop vouchers ======`
- Should show voucher count, customer email, and bonus percent

**Email Sending:**
- Look for `[Email] ====== Sending voucher confirmation email ======`
- Check for `[Email] ✅ Voucher confirmation email sent successfully!`
- Or check for any errors: `[Email] ❌ Error sending voucher email:`

### 3. Common Issues to Check

#### Issue 1: Product ID Mismatch
If logs show:
```
productId: "prod_XXXXX"
expectedProductId: "prod_TPrGcfPjJf2ssT"
isWorkshopVoucher result: false
```

**Solution:** Update your `.env` file with the correct `WORKSHOP_VOUCHER_PRODUCT_ID`

#### Issue 2: Product Not Expanded
If logs show:
```
productId: undefined
```

**Solution:** This means the Stripe API isn't expanding the product. Check if your Stripe API version is correct.

#### Issue 3: Voucher Processing Not Reached
If you see "Tickets processed" but no "Processing workshop vouchers" message:

**Solution:** The voucher wasn't categorized correctly. Check the categorization logs.

### 4. Quick Test Command

Run this to watch logs in real-time during a test purchase:

```bash
# If using Vercel
vercel logs --follow

# If running locally
npm run dev
# Then watch the terminal for [WebhookHandler] and [Email] logs
```

### 5. Manual Test

To manually test the email sending function, you can create a test API route:

```typescript
// src/pages/api/test-voucher-email.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendVoucherConfirmationEmail } from '@/lib/email';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const result = await sendVoucherConfirmationEmail({
    to: 'your-email@example.com',
    firstName: 'Test',
    amountPaid: 100,
    voucherValue: 125,
    currency: 'CHF',
    bonusPercent: 25,
  });

  res.json(result);
}
```

Then test with:
```bash
curl -X POST http://localhost:3000/api/test-voucher-email
```

## What the Logs Tell You

### Success Path
```
[WebhookHandler] isWorkshopVoucher: checking price { priceId: '...', productId: 'prod_TPrGcfPjJf2ssT', ... }
[WebhookHandler] isWorkshopVoucher result: true
[WebhookHandler] ✅ Categorized as: WORKSHOP VOUCHER
[WebhookHandler] ====== Processing workshop vouchers ======
[Email] ====== Sending voucher confirmation email ======
[Email] ✅ Voucher confirmation email sent successfully!
```

### Failure Path (Not Detected)
```
[WebhookHandler] isWorkshopVoucher: checking price { priceId: '...', productId: 'prod_DIFFERENT', ... }
[WebhookHandler] isWorkshopVoucher result: false
[WebhookHandler] ✅ Categorized as: TICKET
[WebhookHandler] voucherLineItems.length: 0
```

## Next Steps

1. Make a test purchase with 1 ticket + 1 voucher
2. Check your logs immediately
3. Look for the log patterns above
4. Share the relevant log section if you need help debugging
