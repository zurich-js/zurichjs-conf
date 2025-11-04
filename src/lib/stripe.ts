/**
 * Stripe client utilities for checkout integration
 */

/**
 * Redirect to Stripe Checkout for a specific price
 * Creates a checkout session on the server and redirects the user
 * @param priceId - Stripe Price ID
 */
export const redirectToCheckout = async (priceId: string): Promise<void> => {
  try {
    // Call backend API to create a checkout session
    const response = await fetch('/api/checkout/create-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        priceId,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create checkout session');
    }

    const { url } = await response.json();

    if (url) {
      // Redirect to Stripe Checkout URL
      window.location.href = url;
    } else {
      throw new Error('No checkout URL returned');
    }
  } catch (err) {
    console.error('Failed to redirect to checkout:', err);
    alert('Failed to start checkout. Please try again.');
  }
};

