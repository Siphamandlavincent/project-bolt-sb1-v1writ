import express from 'express';
import axios from 'axios';
import crypto from 'crypto';
import Stock from '../models/Stock.js';

const router = express.Router();

// Helper function to anonymize IP
const anonymizeIP = (ip) => {
  return crypto.createHash('sha256').update(ip).digest('hex');
};

// Helper function to get stock price
const getStockPrice = async (symbol) => {
  try {
    const response = await axios.get(`https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${symbol}/quote`);
    return response.data.latestPrice;
  } catch (error) {
    throw new Error('Unable to fetch stock price');
  }
};

router.get('/stock-prices', async (req, res) => {
  try {
    const { stock, like } = req.query;
    const clientIP = anonymizeIP(req.ip);

    // Handle single stock request
    if (!Array.isArray(stock)) {
      const stockPrice = await getStockPrice(stock);
      let stockDoc = await Stock.findOne({ symbol: stock.toUpperCase() });

      if (!stockDoc) {
        stockDoc = new Stock({ symbol: stock.toUpperCase(), likes: [] });
      }

      if (like === 'true' && !stockDoc.likes.some(l => l.ip === clientIP)) {
        stockDoc.likes.push({ ip: clientIP });
        await stockDoc.save();
      }

      return res.json({
        stockData: {
          stock: stock.toUpperCase(),
          price: stockPrice,
          likes: stockDoc.likes.length
        }
      });
    }

    // Handle two stocks request
    const stocks = Array.isArray(stock) ? stock : [stock];
    const stockData = await Promise.all(stocks.map(async (symbol) => {
      const price = await getStockPrice(symbol);
      let stockDoc = await Stock.findOne({ symbol: symbol.toUpperCase() });

      if (!stockDoc) {
        stockDoc = new Stock({ symbol: symbol.toUpperCase(), likes: [] });
      }

      if (like === 'true' && !stockDoc.likes.some(l => l.ip === clientIP)) {
        stockDoc.likes.push({ ip: clientIP });
        await stockDoc.save();
      }

      return {
        stock: symbol.toUpperCase(),
        price,
        likes: stockDoc.likes.length
      };
    }));

    // Calculate relative likes
    const rel_likes = stockData[0].likes - stockData[1].likes;
    stockData[0].rel_likes = rel_likes;
    stockData[1].rel_likes = -rel_likes;
    delete stockData[0].likes;
    delete stockData[1].likes;

    return res.json({ stockData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;