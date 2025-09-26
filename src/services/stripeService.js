const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);


class StripeService {
  /**
   * Create a payment intent for a course purchase
   * @param {Object} params - Payment parameters
   * @param {number} params.amount - Amount in cents
   * @param {string} params.currency - Currency code (e.g., 'usd')
   * @param {string} params.customerEmail - Customer email
   * @param {string} params.courseTitle - Course title for description
   * @param {string} params.purchaseId - Purchase ID for metadata
   * @returns {Promise<Object>} Payment intent object
   */

  async createPaymentIntent(params) {
    try {
      const { amount, currency = 'usd', customerEmail, courseTitle, purchaseId } = params;

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        customer_email: customerEmail,
        description: `Course Purchase: ${courseTitle}`,
        metadata: {
          purchase_id: purchaseId,
          course_title: courseTitle,
          customer_email: customerEmail
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        success: true,
        data: {
          client_secret: paymentIntent.client_secret,
          payment_intent_id: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency
        }
      };
    } catch (error) {
      console.error('Stripe payment intent creation error:', error);
      return {
        success: false,
        error: {
          code: 'STRIPE_ERROR',
          message: error.message || 'Failed to create payment intent'
        }
      };
    }
  }

  /**
   * Retrieve payment intent status
   * @param {string} paymentIntentId - Payment intent ID
   * @returns {Promise<Object>} Payment intent status
   */
  async getPaymentIntentStatus(paymentIntentId) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      return {
        success: true,
        data: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          metadata: paymentIntent.metadata
        }
      };
    } catch (error) {
      console.error('Stripe payment intent retrieval error:', error);
      return {
        success: false,
        error: {
          code: 'STRIPE_ERROR',
          message: error.message || 'Failed to retrieve payment intent'
        }
      };
    }
  }

  /**
   * Create a Stripe customer
   * @param {Object} params - Customer parameters
   * @param {string} params.email - Customer email
   * @param {string} params.name - Customer name
   * @param {string} params.phone - Customer phone (optional)
   * @returns {Promise<Object>} Customer object
   */
  async createCustomer(params) {
    try {
      const { email, name, phone } = params;

      const customer = await stripe.customers.create({
        email,
        name,
        phone,
        metadata: {
          source: 'detailers_university'
        }
      });

      return {
        success: true,
        data: {
          customer_id: customer.id,
          email: customer.email,
          name: customer.name
        }
      };
    } catch (error) {
      console.error('Stripe customer creation error:', error);
      return {
        success: false,
        error: {
          code: 'STRIPE_ERROR',
          message: error.message || 'Failed to create customer'
        }
      };
    }
  }

  /**
   * Handle webhook events from Stripe
   * @param {Object} event - Stripe webhook event
   * @returns {Promise<Object>} Processing result
   */
  async handleWebhookEvent(event) {
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          return await this.handlePaymentSuccess(event.data.object);
        case 'payment_intent.payment_failed':
          return await this.handlePaymentFailure(event.data.object);
        default:
          console.log(`Unhandled event type: ${event.type}`);
          return { success: true, message: 'Event received but not processed' };
      }
    } catch (error) {
      console.error('Webhook processing error:', error);
      return {
        success: false,
        error: {
          code: 'WEBHOOK_ERROR',
          message: error.message || 'Failed to process webhook'
        }
      };
    }
  }

  /**
   * Handle successful payment
   * @param {Object} paymentIntent - Payment intent object
   * @returns {Promise<Object>} Processing result
   */
  async handlePaymentSuccess(paymentIntent) {
    const purchaseId = paymentIntent.metadata.purchase_id;
    
    // This will be called by the webhook handler to update purchase status
    return {
      success: true,
      data: {
        purchase_id: purchaseId,
        payment_status: 'PAID',
        payment_intent_id: paymentIntent.id,
        amount_paid: paymentIntent.amount / 100 // Convert back to dollars
      }
    };
  }

  /**
   * Handle failed payment
   * @param {Object} paymentIntent - Payment intent object
   * @returns {Promise<Object>} Processing result
   */
  async handlePaymentFailure(paymentIntent) {
    const purchaseId = paymentIntent.metadata.purchase_id;
    
    return {
      success: true,
      data: {
        purchase_id: purchaseId,
        payment_status: 'FAILED',
        payment_intent_id: paymentIntent.id,
        failure_reason: paymentIntent.last_payment_error?.message || 'Payment failed'
      }
    };
  }
}

module.exports = new StripeService();