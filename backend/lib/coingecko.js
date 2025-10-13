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
      try {
        const response = await axios.get(`${API_URL}/simple/price`, {
          params: {
            ids: cryptoId,
            vs_currencies: 'usd'
          },
          headers: {
            'x-cg-demo-api-key': API_KEY
          },
          timeout: 10000 // 10 second timeout
        });
        
        if (!response.data[cryptoId]) {
          throw new Error(`No price data for ${cryptoId}`);
        }
        
        return response.data[cryptoId].usd;
      } catch (error) {
        console.error('CoinGecko API error:', {
          message: error.message,
          code: error.code,
          status: error.response?.status,
          data: error.response?.data,
          timestamp: new Date().toISOString()
        });
        throw error;
      }
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
    
    // Create headers object with API key
    const headers = {
      'x-cg-demo-api-key': API_KEY
    };

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
  },

  // Helper function to calculate price ranges for Bitcoin predictions
  calculatePriceRanges(initialPrice) {
    const percent3 = initialPrice * 0.03;
    const percent5 = initialPrice * 0.05;
    
    return {
      "0-3% up": {
        min: initialPrice,
        max: initialPrice + percent3
      },
      "3-5% up": {
        min: initialPrice + percent3,
        max: initialPrice + percent5
      },
      "5%+ up": {
        min: initialPrice + percent5,
        max: null  // No upper limit
      },
      "0-3% down": {
        min: initialPrice - percent3,
        max: initialPrice
      },
      "3-5% down": {
        min: initialPrice - percent5,
        max: initialPrice - percent3
      },
      "5%+ down": {
        min: null,  // No lower limit
        max: initialPrice - percent5
      }
    };
  },

  // Helper function to determine which price range a final price falls into
  determinePriceRange(initialPrice, finalPrice) {
    const ranges = this.calculatePriceRanges(initialPrice);
    
    for (const [rangeName, range] of Object.entries(ranges)) {
      const { min, max } = range;
      
      // Handle special cases for null boundaries
      if (min === null && max !== null) {
        // "5%+ down" case - price must be below max
        if (finalPrice < max) {
          return rangeName;
        }
      } else if (min !== null && max === null) {
        // "5%+ up" case - price must be above min
        if (finalPrice > min) {
          return rangeName;
        }
      } else if (min !== null && max !== null) {
        // Regular range case - price must be within range (inclusive)
        if (finalPrice >= min && finalPrice <= max) {
          return rangeName;
        }
      }
    }
    
    // Fallback - should not happen with proper ranges
    return "0-3% up";
  }
};