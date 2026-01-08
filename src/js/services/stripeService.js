import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe with publishable key
const STRIPE_PUBLISHABLE_KEY = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || '';
const STRIPE_SECRET_KEY = process.env.REACT_APP_STRIPE_SECRET_KEY || '';

let stripePromise = null;

export const getStripe = () => {
  if (!stripePromise && STRIPE_PUBLISHABLE_KEY) {
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise;
};

// Create checkout session directly using secret key
export const createCheckoutSession = async (planData, userId, userEmail, currency = 'gbp') => {
  try {
    if (!STRIPE_SECRET_KEY) {
      throw new Error('Stripe secret key is not configured');
    }

    const currencyCode = currency.toLowerCase();
    const amount = planData.cost;
    
    // Validate currency code
    if (!currencyCode || currencyCode.length !== 3) {
      throw new Error(`Invalid currency code: ${currencyCode}`);
    }
    
    // Convert amount to smallest currency unit (cents/pence/paisa)
    // For most currencies, multiply by 100, but some have different decimal places
    // JPY and KRW don't have decimal places, so amount is already in smallest unit
    let amountInSmallestUnit;
    if (currencyCode === 'jpy' || currencyCode === 'krw') {
      amountInSmallestUnit = Math.round(amount);
    } else {
      amountInSmallestUnit = Math.round(amount * 100);
    }
    
    console.log(`Payment details: ${amount} ${currencyCode.toUpperCase()} = ${amountInSmallestUnit} smallest units`);
    
    // Minimum amounts per currency (in smallest unit) - Stripe's actual minimums
    const minimumAmounts = {
      'gbp': 30,      // 30 pence (£0.30)
      'usd': 50,      // 50 cents ($0.50)
      'eur': 50,      // 50 cents (€0.50)
      'inr': 100,     // 1 rupee (100 paise) - Stripe minimum
      'aud': 50,
      'cad': 50,
      'jpy': 50,      // JPY has no decimal places
      'krw': 100,
    };
    
    const minimumAmount = minimumAmounts[currencyCode] || 50;
    
    if (amountInSmallestUnit < minimumAmount) {
      const minDisplay = currencyCode === 'jpy' || currencyCode === 'krw' 
        ? minimumAmount 
        : (minimumAmount / 100).toFixed(2);
      throw new Error(`Amount is too small. Minimum amount for ${currencyCode.toUpperCase()} is ${minDisplay} ${currencyCode.toUpperCase()}. Current amount: ${amount} ${currencyCode.toUpperCase()}.`);
    }
    
    console.log(`Creating checkout: ${amount} ${currencyCode.toUpperCase()} = ${amountInSmallestUnit} smallest units`);

    // Plan validity map matching Flutter model
    const planValidityMap = {
      'Ybe Plus': 30,
      'Ybe Premium': 90,
      'Ybe Gold': 180,
    };
    
    // Get validity days - use from planData or calculate from plan name
    let validityDays = planData.validityDays;
    if (!validityDays || validityDays === 0) {
      // Calculate from plan name if validityDays is missing
      const planName = planData.name || '';
      if (planName.includes('Plus') || planName.toLowerCase().includes('plus')) {
        validityDays = planValidityMap['Ybe Plus'];
      } else if (planName.includes('Premium') || planName.toLowerCase().includes('premium')) {
        validityDays = planValidityMap['Ybe Premium'];
      } else if (planName.includes('Gold') || planName.toLowerCase().includes('gold')) {
        validityDays = planValidityMap['Ybe Gold'];
      } else {
        validityDays = 30; // Default
      }
    }

    // Create checkout session using Stripe API directly
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'payment_method_types[0]': 'card',
        'line_items[0][price_data][currency]': currencyCode,
        'line_items[0][price_data][product_data][name]': planData.name,
        'line_items[0][price_data][product_data][description]': `Subscription for ${validityDays} days`,
        'line_items[0][price_data][unit_amount]': amountInSmallestUnit.toString(),
        'line_items[0][quantity]': '1',
        'mode': 'payment',
        'success_url': `${window.location.origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        'cancel_url': `${window.location.origin}/payment-cancel`,
        'customer_email': userEmail,
        'metadata[userId]': userId,
        'metadata[planId]': planData.id || planData.name,
        'metadata[planName]': planData.name,
        'metadata[validityDays]': validityDays.toString(),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: 'Failed to create checkout session' } }));
      throw new Error(errorData.error?.message || 'Failed to create checkout session');
    }

    const session = await response.json();
    
    if (session.id && session.url) {
      // Redirect directly to the checkout session URL
      window.location.href = session.url;
    } else {
      throw new Error('Failed to create checkout session or get redirect URL');
    }
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
};

// Verify payment session
export const verifyPaymentSession = async (sessionId) => {
  try {
    if (!STRIPE_SECRET_KEY) {
      throw new Error('Stripe secret key is not configured');
    }

    const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to verify payment session');
    }

    const session = await response.json();
    return session;
  } catch (error) {
    console.error('Error verifying payment session:', error);
    throw error;
  }
};

