const { Client, Environment } = require('square');

class SquareService {
  constructor() {
    if (!process.env.SQUARE_ACCESS_TOKEN || !process.env.SQUARE_LOCATION_ID) {
      this.client = null;
    } else {
      this.client = new Client({
        accessToken: process.env.SQUARE_ACCESS_TOKEN,
        environment: (process.env.SQUARE_ENVIRONMENT || 'sandbox').toLowerCase() === 'production' ? Environment.Production : Environment.Sandbox,
      });
      this.paymentsApi = this.client.paymentsApi;
    }
  }

  async createPayment({ amount, currency = 'USD', sourceId, idempotencyKey, locationId, note, metadata = {} }) {
    try {
      const body = {
        idempotencyKey,
        sourceId,
        locationId,
        amountMoney: {
          amount: Math.round(amount * 100),
          currency: currency.toUpperCase(),
        },
        note,
        metadata,
      };
      if (!this.paymentsApi) {
        return { success: false, error: { code: 'SQUARE_NOT_CONFIGURED', message: 'Square is not configured' } };
      }
      const result = await this.paymentsApi.createPayment(body);
      return { success: true, data: result.result.payment };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SQUARE_ERROR',
          message: error?.message || 'Failed to create Square payment',
        },
      };
    }
  }
}

module.exports = new SquareService();