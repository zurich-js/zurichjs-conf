# Component Integration Examples

This document provides real-world examples of integrating analytics and logging into React components.

## Table of Contents

1. [Ticket Purchase Flow](#ticket-purchase-flow)
2. [Checkout Form](#checkout-form)
3. [Workshop Registration](#workshop-registration)
4. [Navigation Tracking](#navigation-tracking)
5. [Error Boundaries](#error-boundaries)

---

## Ticket Purchase Flow

### Ticket Card Component

```typescript
// src/components/organisms/TicketCard.tsx
import { useState } from 'react'
import { analytics, trackTicketAddedToCart } from '@/lib/analytics'
import { logger } from '@/lib/logger'
import type { TicketCategory, TicketStage } from '@/lib/types/ticket-constants'

interface TicketCardProps {
  category: TicketCategory
  stage: TicketStage
  price: number
  title: string
  features: string[]
}

export function TicketCard({ category, stage, price, title, features }: TicketCardProps) {
  const [quantity, setQuantity] = useState(1)
  const log = logger.scope('TicketCard')

  const handleViewDetails = () => {
    analytics.track('ticket_viewed', {
      ticket_category: category,
      ticket_stage: stage,
      ticket_price: price,
      currency: 'CHF',
      ticket_count: 1,
    })

    log.debug('Ticket details viewed', {
      category,
      stage,
      price,
    })
  }

  const handleAddToCart = () => {
    try {
      // Track analytics BEFORE adding to cart
      trackTicketAddedToCart({
        category,
        stage,
        price,
        quantity,
      })

      // Add to cart logic
      addToCart({ category, stage, price, quantity })

      log.info('Ticket added to cart', {
        category,
        stage,
        quantity,
        totalPrice: price * quantity,
      })

      toast.success('Ticket added to cart!')
    } catch (error) {
      log.error('Failed to add ticket to cart', error, {
        type: 'system',
        severity: 'medium',
        category,
        stage,
      })

      analytics.error('Failed to add ticket to cart', error, {
        type: 'system',
        severity: 'medium',
      })

      toast.error('Failed to add ticket. Please try again.')
    }
  }

  return (
    <div className="ticket-card">
      <h3>{title}</h3>
      <p className="price">{price / 100} CHF</p>

      <ul>
        {features.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>

      <div className="quantity-selector">
        <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button>
        <span>{quantity}</span>
        <button onClick={() => setQuantity(quantity + 1)}>+</button>
      </div>

      <button onClick={handleViewDetails}>View Details</button>
      <button onClick={handleAddToCart}>Add to Cart</button>
    </div>
  )
}
```

---

## Checkout Form

### Checkout Component with Validation Tracking

```typescript
// src/components/organisms/CheckoutForm.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { analytics, trackCheckoutStarted, trackFormError } from '@/lib/analytics'
import { logger } from '@/lib/logger'
import { useCart } from '@/contexts/CartContext'

const checkoutSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
})

type CheckoutFormData = z.infer<typeof checkoutSchema>

export function CheckoutForm() {
  const { cart, total } = useCart()
  const log = logger.scope('CheckoutForm')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
  })

  // Track form field errors
  useEffect(() => {
    const errorFields = Object.keys(errors)
    if (errorFields.length > 0) {
      errorFields.forEach((field) => {
        const error = errors[field as keyof typeof errors]
        if (error) {
          trackFormError({
            formName: 'checkout_form',
            formField: field,
            errorMessage: error.message || 'Validation error',
            errorType: 'validation',
          })

          log.debug('Form validation error', {
            field,
            message: error.message,
          })
        }
      })
    }
  }, [errors])

  const onSubmit = async (data: CheckoutFormData) => {
    setIsSubmitting(true)
    log.info('Checkout form submitted', {
      email: data.email,
      hasCompany: !!data.company,
      cartItems: cart.length,
    })

    try {
      // Track checkout started
      trackCheckoutStarted({
        cartItemCount: cart.length,
        cartTotalAmount: total,
        cartCurrency: 'CHF',
        cartItems: cart.map((item) => ({
          type: 'ticket',
          category: item.category,
          stage: item.stage,
          quantity: item.quantity,
          price: item.price,
        })),
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
      })

      // Identify user
      analytics.identify(data.email, {
        email: data.email,
        first_name: data.firstName,
        last_name: data.lastName,
        name: `${data.firstName} ${data.lastName}`,
        company: data.company,
        job_title: data.jobTitle,
      })

      // Create Stripe checkout session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerEmail: data.email,
          customerName: `${data.firstName} ${data.lastName}`,
          company: data.company,
          jobTitle: data.jobTitle,
          cartItems: cart,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const { sessionUrl } = await response.json()

      // Track successful form submission
      analytics.track('form_submitted', {
        form_name: 'checkout_form',
        form_type: 'checkout',
        form_success: true,
      })

      log.info('Checkout session created successfully', {
        redirecting: true,
      })

      // Redirect to Stripe
      window.location.href = sessionUrl
    } catch (error) {
      log.error('Checkout submission failed', error, {
        type: 'payment',
        severity: 'high',
        email: data.email,
      })

      analytics.track('form_error', {
        form_name: 'checkout_form',
        error_message: error.message,
        error_type: 'payment',
        error_severity: 'high',
      })

      toast.error('Failed to start checkout. Please try again.')
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('email')} placeholder="Email" />
      {errors.email && <span className="error">{errors.email.message}</span>}

      <input {...register('firstName')} placeholder="First Name" />
      {errors.firstName && <span className="error">{errors.firstName.message}</span>}

      <input {...register('lastName')} placeholder="Last Name" />
      {errors.lastName && <span className="error">{errors.lastName.message}</span>}

      <input {...register('company')} placeholder="Company (Optional)" />
      <input {...register('jobTitle')} placeholder="Job Title (Optional)" />

      <button
        type="submit"
        disabled={isSubmitting}
        onClick={() => {
          analytics.track('button_clicked', {
            button_text: 'Complete Checkout',
            button_location: 'checkout_form',
            button_action: 'submit_checkout',
          })
        }}
      >
        {isSubmitting ? 'Processing...' : 'Complete Checkout'}
      </button>
    </form>
  )
}
```

---

## Workshop Registration

```typescript
// src/components/organisms/WorkshopCard.tsx
import { analytics, trackWorkshopViewed } from '@/lib/analytics'
import { logger } from '@/lib/logger'

interface WorkshopCardProps {
  id: string
  title: string
  instructor: string
  capacity: number
  availableSeats: number
}

export function WorkshopCard({
  id,
  title,
  instructor,
  capacity,
  availableSeats,
}: WorkshopCardProps) {
  const log = logger.scope('WorkshopCard')

  useEffect(() => {
    // Track workshop view on mount
    trackWorkshopViewed({
      workshopId: id,
      workshopTitle: title,
      workshopInstructor: instructor,
      workshopCapacity: capacity,
    })

    log.debug('Workshop card viewed', {
      workshopId: id,
      title,
      availableSeats,
    })
  }, [id])

  const handleRegister = async () => {
    try {
      log.info('Workshop registration initiated', {
        workshopId: id,
        title,
      })

      // Registration logic...

      analytics.track('workshop_registered', {
        workshop_id: id,
        workshop_title: title,
        workshop_instructor: instructor,
        workshop_capacity: capacity,
        registration_status: 'confirmed',
      })

      log.info('Workshop registration successful', {
        workshopId: id,
      })

      toast.success('Successfully registered!')
    } catch (error) {
      log.error('Workshop registration failed', error, {
        type: 'system',
        severity: 'medium',
        workshopId: id,
      })

      toast.error('Registration failed. Please try again.')
    }
  }

  return (
    <div className="workshop-card">
      <h3>{title}</h3>
      <p>Instructor: {instructor}</p>
      <p>Available: {availableSeats} / {capacity}</p>

      <button
        onClick={handleRegister}
        disabled={availableSeats === 0}
      >
        {availableSeats === 0 ? 'Sold Out' : 'Register'}
      </button>
    </div>
  )
}
```

---

## Navigation Tracking

### App-Level Page View Tracking

```typescript
// src/pages/_app.tsx
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { analytics } from '@/lib/analytics/client'
import { logger } from '@/lib/logger'
import type { AppProps } from 'next/app'

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter()
  const log = logger.scope('App')

  useEffect(() => {
    const handleRouteChange = (url: string) => {
      // Determine page category
      let category: 'landing' | 'tickets' | 'workshops' | 'checkout' | 'admin' | 'other' = 'other'

      if (url === '/') category = 'landing'
      else if (url.startsWith('/tickets')) category = 'tickets'
      else if (url.startsWith('/workshops')) category = 'workshops'
      else if (url.startsWith('/cart') || url.startsWith('/checkout')) category = 'checkout'
      else if (url.startsWith('/admin')) category = 'admin'

      // Track page view
      analytics.pageView(url, document.title, category)

      log.debug('Page view tracked', {
        url,
        category,
      })
    }

    // Track initial page load
    handleRouteChange(router.pathname)

    // Track route changes
    router.events.on('routeChangeComplete', handleRouteChange)

    return () => {
      router.events.off('routeChangeComplete', handleRouteChange)
    }
  }, [router.events, router.pathname])

  return <Component {...pageProps} />
}
```

### Link Click Tracking

```typescript
// src/components/atoms/TrackedLink.tsx
import Link from 'next/link'
import { analytics } from '@/lib/analytics'

interface TrackedLinkProps {
  href: string
  children: React.ReactNode
  location: string
  className?: string
}

export function TrackedLink({ href, children, location, className }: TrackedLinkProps) {
  const handleClick = () => {
    const isExternal = href.startsWith('http')

    analytics.track('link_clicked', {
      link_text: typeof children === 'string' ? children : href,
      link_url: href,
      link_type: isExternal ? 'external' : 'internal',
      link_location: location,
    })
  }

  return (
    <Link href={href} className={className} onClick={handleClick}>
      {children}
    </Link>
  )
}
```

---

## Error Boundaries

### Error Boundary with Analytics

```typescript
// src/components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react'
import { analytics } from '@/lib/analytics/client'
import { logger } from '@/lib/logger'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  private log = logger.scope('ErrorBoundary')

  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error
    this.log.error('React error boundary caught error', error, {
      type: 'system',
      severity: 'high',
      code: 'REACT_ERROR',
      componentStack: errorInfo.componentStack,
    })

    // Track in analytics
    analytics.error('React component error', error, {
      type: 'system',
      severity: 'high',
      componentStack: errorInfo.componentStack,
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="error-fallback">
            <h2>Something went wrong</h2>
            <p>We've been notified and are looking into it.</p>
            <button onClick={() => window.location.reload()}>
              Reload Page
            </button>
          </div>
        )
      )
    }

    return this.props.children
  }
}
```

---

## API Route Example

```typescript
// src/pages/api/tickets/transfer.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { serverAnalytics } from '@/lib/analytics/server'
import { logger } from '@/lib/logger'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const log = logger.scope('TransferTicketAPI', {
    requestId: req.headers['x-request-id'] as string,
  })

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { ticketId, toEmail } = req.body

  log.info('Ticket transfer initiated', {
    ticketId,
    toEmail,
  })

  try {
    // Transfer ticket logic...
    const ticket = await transferTicket(ticketId, toEmail)

    // Track analytics
    await serverAnalytics.track('ticket_transferred', toEmail, {
      ticket_id: ticketId,
      from_email: ticket.originalEmail,
      to_email: toEmail,
      transferred_at: new Date().toISOString(),
    })

    await serverAnalytics.flush()

    log.info('Ticket transferred successfully', {
      ticketId,
      toEmail,
    })

    res.status(200).json({ success: true, ticket })
  } catch (error) {
    log.error('Ticket transfer failed', error, {
      type: 'system',
      severity: 'high',
      ticketId,
      toEmail,
    })

    res.status(500).json({ error: 'Transfer failed' })
  }
}
```

---

## Best Practices Summary

1. **Track early**: Track analytics BEFORE performing actions
2. **Scoped loggers**: Use `logger.scope()` in components
3. **Type safety**: Let TypeScript guide you with autocomplete
4. **Context matters**: Always include relevant IDs and metadata
5. **Error handling**: Log errors with appropriate severity
6. **Flush server events**: Always flush before serverless functions exit
7. **User identification**: Identify users early in the flow
8. **Consistent naming**: Use the same event names across the app
