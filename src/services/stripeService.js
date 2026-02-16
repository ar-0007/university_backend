const { Client, Environment } = require('square');

class StripeService {
  constructor() {
    if (process.env.SQUARE_ACCESS_TOKEN) {
      const client = new Client({
        accessToken: process.env.SQUARE_ACCESS_TOKEN,
        environment:
          process.env.SQUARE_ENVIRONMENT === 'production' || process.env.NODE_ENV === 'production'
            ? Environment.Production
            : Environment.Sandbox
      });
      this.paymentsApi = client.paymentsApi;
    } else {
      this.paymentsApi = null;
    }
  }

  async createPayment(params) {
    try {
      if (!this.paymentsApi) {
        return {
          success: false,
          error: {
            code: 'SQUARE_NOT_CONFIGURED',
            message: 'Square payments are not configured'
          }
        };
      }

      const {
        amount,
        currency = 'usd',
        sourceId,
        idempotencyKey,
        customerEmail,
        courseTitle,
        purchaseId
      } = params;

      const amountInCents = Math.round(Number(amount) * 100);

      const body = {
        sourceId,
        idempotencyKey,
        amountMoney: {
          amount: BigInt(amountInCents),
          currency: currency.toUpperCase()
        },
        note: `Course Purchase: ${courseTitle}`,
        referenceId: purchaseId
      };

      const response = await this.paymentsApi.createPayment(body);
      const payment = response.result.payment;

      return {
        success: true,
        data: {
          payment_id: payment.id,
          status: payment.status,
          amount: Number(payment.amountMoney.amount),
          currency: payment.amountMoney.currency,
          customer_email: customerEmail
        }
      };
    } catch (error) {
      console.error('Square payment creation error:', error);
      return {
        success: false,
        error: {
          code: 'SQUARE_ERROR',
          message: error.message || 'Failed to create payment'
        }
      };
    }
  }
}

module.exports = new StripeService();
