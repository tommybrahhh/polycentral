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

  async getHistoricalPrice(coinId, date) {
    // The CoinGecko API requires the date to be in DD-MM-YYYY format.
    // This function takes the incoming JavaScript Date object and formats it correctly.
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // .getMonth() is 0-based, so we add 1
    const year = date.getFullYear();
    const formattedDate = `${day}-${month}-${year}`;

    // Construct the URL with the correctly formatted date.
    const url = `https://api.coingecko.com/api/v3/coins/${coinId}/history?date=${formattedDate}&localization=false`;
    
    // The BASE_URL and headers variables are assumed to be defined elsewhere in this file.
    // If they are not, replace the URL above with the full, hardcoded URL.

    try {
      const response = await axios.get(url, { headers });
      
      // Defensive check: Ensure the expected data structure exists before accessing it.
      if (response.data && response.data.market_data && response.data.market_data.current_price && response.data.market_data.current_price.usd) {
        return response.data.market_data.current_price.usd;
      } else {
        // Handle cases where the API returns a success status but no price data is available.
        throw new Error(`No price data found in CoinGecko response for ${coinId} on ${formattedDate}`);
      }
    } catch (error) {
      // Re-throw the original error. This allows the calling function in `server.js`
      // to catch and log it with its more detailed error handling logic.
      throw error;
    }
  }
};