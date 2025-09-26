const express = require('express');
const router = express.Router();
const stripeService = require('../services/stripeService');
const guestCoursePurchaseService = require('../services/guestCoursePurchaseService');
const { getSupabaseClient } = require('../utils/supabaseClient');

// Stripe webhook endpoint
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // Verify webhook signature
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    const supabase = getSupabaseClient();
    
    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        const purchaseId = paymentIntent.metadata.purchase_id;
        
        if (purchaseId) {
          // Update purchase status to PAID
          await guestCoursePurchaseService.updatePaymentStatus(
            supabase,
            purchaseId,
            'PAID',
            'stripe',
            paymentIntent.id
          );
          
          console.log(`Payment succeeded for purchase ${purchaseId}`);
        }
        break;
        
      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        const failedPurchaseId = failedPayment.metadata.purchase_id;
        
        if (failedPurchaseId) {
          // Update purchase status to FAILED
          await guestCoursePurchaseService.updatePaymentStatus(
            supabase,
            failedPurchaseId,
            'FAILED',
            'stripe',
            failedPayment.id
          );
          
          console.log(`Payment failed for purchase ${failedPurchaseId}`);
        }
        break;
        
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

module.exports = router;