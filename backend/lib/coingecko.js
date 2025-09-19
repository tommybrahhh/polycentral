const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.COINGECKO_API_KEY;
const API_URL = 'https://api.coingecko.com/api/v3';

// Helper function for retry logic
const withRetry = async (fn, maxRetries = 3, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

module.exports = {
  async getCurrentPrice(cryptoId) {
    return withRetry(async () => {
      const response = await axios.get(`${API_URL}/simple/price`, {
        params: {
          ids: cryptoId,
          vs_currencies: 'usd'
        },
        headers: {
          'x-cg-demo-api-key': API_KEY
        }
      });
      
      if (!response.data[cryptoId]) {
        throw new Error(`No price data for ${cryptoId}`);
      }
      
      return response.data[cryptoId].usd;
    });
  },

  async getHistoricalPrice(cryptoId, date) {
    return withRetry(async () => {
      const formattedDate = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
      const response = await axios.get(`${API_URL}/coins/${cryptoId}/history`, {
        params: { date: formattedDate },
        headers: {
          'x-cg-demo-api-key': API_KEY
        }
      });
      
      if (!response.data.market_data?.current_price?.usd) {
        throw new Error('No historical price data');
      }
      
      return response.data.market_data.current_price.usd;
    });
  }
};