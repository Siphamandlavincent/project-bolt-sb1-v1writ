import mongoose from 'mongoose';

const stockSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    unique: true
  },
  likes: [{
    ip: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
});

export default mongoose.model('Stock', stockSchema);