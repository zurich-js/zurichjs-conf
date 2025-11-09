# Email Template System

Production-ready React Email template system for Zurich JS Conf 2026 tickets.

## 📁 Structure

```
emails/
├── design/
│   └── tokens.ts          # Design system tokens (colors, typography, spacing)
├── components/
│   ├── EmailLayout.tsx    # Main wrapper with preheader
│   ├── TicketCard.tsx     # Ticket design with QR and wallet buttons
│   ├── InfoBlock.tsx      # Label/value pairs
│   ├── BadgePill.tsx      # Status badges (e.g., "Early bird")
│   ├── WalletButton.tsx   # Apple/Google Wallet buttons
│   └── index.ts           # Component exports
├── templates/
│   └── TicketPurchaseEmail.tsx  # Main ticket confirmation template
├── examples/
│   └── ticket-purchase.example.tsx  # Sample data for development
└── README.md
```

## 🎨 Design System

All design tokens are centralized in `design/tokens.ts`:

- **Colors**: Brand colors, text, surfaces, borders, badges
- **Typography**: Font families, sizes, weights, line heights
- **Spacing**: Consistent spacing scale (4px increments)
- **Layout**: Container widths, padding, gaps
- **Radii**: Border radius values
- **Shadows**: Box shadow definitions

## 🧩 Components

### EmailLayout

Main wrapper for all emails. Handles dark mode and provides consistent structure.

```tsx
<EmailLayout preheader="Your Standard Ticket for Zurich JS Conf 2026">
  {/* Email content */}
</EmailLayout>
```

### TicketCard

Complete ticket design with:
- Perforation nibbles on left/right edges
- Header with logo and event info
- Location and date blocks
- Attendee info with QR code
- Apple/Google Wallet integration

```tsx
<TicketCard
  eventName="Zurich JS Conf 2026"
  tierLabel="Standard Ticket"
  badgeLabel="Early bird"
  venueName="Technopark Zürich"
  venueAddress="Technoparkstrasse 1,\n8005 Zürich"
  dateLabel="September 11, 2026"
  timeLabel="09:00 – 17:00"
  tz="CEST"
  fullName="Max Mustermann"
  email="email@domain.com"
  ticketId="ZJS2026-12345"
  qrSrc="https://..."
  logoSrc="https://..."
  appleWalletUrl="https://..."
  googleWalletUrl="https://..."
/>
```

### InfoBlock

Reusable label/value display.

```tsx
<InfoBlock label="Location" value="Technopark Zürich\nTechnoparkstrasse 1" />
```

### BadgePill

Status pill badge.

```tsx
<BadgePill>Early bird</BadgePill>
```

### WalletButton

Apple or Google Wallet button.

```tsx
<WalletButton vendor="apple" href="https://..." />
<WalletButton vendor="google" href="https://..." />
```

## 📧 Templates

### TicketPurchaseEmail

Main ticket confirmation email template.

**Props:**
- All `TicketCard` props
- `firstName`: Recipient's first name
- `orderUrl`: Link to order management
- `calendarUrl`: Add to calendar link
- `venueMapUrl`: Google Maps link
- `refundPolicyUrl`: Refund policy link (default provided)
- `supportEmail`: Support email (default: hello@zurichjs.com)
- `notes`: Optional important notes

**Example:**
```tsx
import { TicketPurchaseEmail } from '@/emails/templates/TicketPurchaseEmail';

<TicketPurchaseEmail
  firstName="Max"
  fullName="Max Mustermann"
  email="email@domain.com"
  eventName="Zurich JS Conf 2026"
  tierLabel="Standard Ticket"
  badgeLabel="Early bird"
  // ... other props
/>
```

## 🧪 Development & Testing

### Using Examples

Sample data is provided in `examples/ticket-purchase.example.tsx`:

```tsx
import { sampleTicketData } from '@/emails/examples/ticket-purchase.example';
import { TicketPurchaseEmail } from '@/emails/templates/TicketPurchaseEmail';

<TicketPurchaseEmail {...sampleTicketData} />
```

### React Email Preview

If using React Email's preview server:

```bash
npm install react-email @react-email/components
npx email dev
```

Point the preview to `src/emails/examples/ticket-purchase.example.tsx`.

## 📱 Email Client Support

Tested and optimized for:
- ✅ Gmail (Web, iOS, Android)
- ✅ Apple Mail (macOS, iOS)
- ✅ Outlook (Windows, macOS, Web)
- ✅ Yahoo Mail
- ✅ iOS Mail
- ✅ Android Mail

## ♿ Accessibility

- Semantic HTML headings
- Alt text on all images
- Minimum 14px font size
- 4.5:1 color contrast ratios
- 44px minimum tap targets
- Screen reader friendly markup
- Focus/hover states where supported

## 🌙 Dark Mode

The email system includes dark mode support:
- Email canvas darkens to `#1C1C1C`
- Ticket card remains white for printability
- Text maintains proper contrast
- Graceful fallback for unsupported clients

## 🎯 Best Practices

### Images

Always use:
- 2x resolution for retina displays
- Descriptive alt text
- Absolute URLs (https://)
- Reliable CDN hosting

### QR Codes

- Minimum 144x144px display size
- 288x288px actual image (2x)
- High contrast (black on white)
- Error correction level: H (30%)

### Wallet Integration

Generate platform-specific passes:
- Apple: `.pkpass` files
- Google: JWT-based URLs
- Include deep links for native apps

### Data Formatting

Format server-side before injecting:
- Dates: Use `Intl.DateTimeFormat`
- Times: Include timezone
- Addresses: Use `\n` for line breaks
- Currency: Use `Intl.NumberFormat`

## 🔧 Customization

### Adding New Ticket Types

1. Create new badge variant in `tokens.ts`:
```ts
export const colors = {
  badge: {
    // ... existing
    vip: { bg: '#...' , fg: '#...' },
  },
};
```

2. Pass appropriate `badgeLabel` to `TicketCard`

### Modifying Styles

All styles are inline and centralized:
- Update `design/tokens.ts` for global changes
- Modify component styles for specific tweaks
- Use `@media (prefers-color-scheme: dark)` for dark mode

### Adding New Templates

1. Create in `templates/`
2. Import components from `components/`
3. Use design tokens from `design/tokens`
4. Add example in `examples/`

## 📦 Integration

### With Resend

```ts
import { TicketPurchaseEmail } from '@/emails/templates/TicketPurchaseEmail';
import { render } from '@react-email/render';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const html = render(<TicketPurchaseEmail {...props} />);

await resend.emails.send({
  from: 'ZurichJS Conference <hello@zurichjs.com>',
  to: customerEmail,
  subject: 'Your ticket for Zurich JS Conf 2026',
  html,
});
```

### With Stripe Webhooks

```ts
// In webhook handler
if (event.type === 'checkout.session.completed') {
  const session = event.data.object;

  const emailProps: TicketPurchaseEmailProps = {
    firstName: session.customer_details.name.split(' ')[0],
    fullName: session.customer_details.name,
    email: session.customer_details.email,
    ticketId: generateTicketId(),
    qrSrc: await generateQR(ticketId),
    // ... other props
  };

  await sendTicketEmail(emailProps);
}
```

## 🚀 Production Checklist

- [ ] Replace placeholder images with production assets
- [ ] Generate real QR codes with ticket data
- [ ] Set up Apple/Google Wallet pass generation
- [ ] Configure proper email sending domain
- [ ] Add SPF, DKIM, DMARC records
- [ ] Test in all major email clients
- [ ] Verify mobile responsiveness
- [ ] Check dark mode rendering
- [ ] Test screen reader compatibility
- [ ] Set up email analytics tracking
- [ ] Add unsubscribe links (if needed)
- [ ] Configure bounce/complaint handling

## 📝 License

Part of the ZurichJS Conference project.
