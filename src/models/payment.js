const mongoose = require('mongoose');

// Define the company schema
const paymentSchema = new mongoose.Schema({
  amountPaid: { type: String, required: true },
  companyName: { type: String, required: true },
  month:{type:String, default:''},
  year:{ type:String, default:'' },
  transactionReceipt:{type:String, default:''},
  isApproved:{
      type:Boolean,
      default:false
  }
});

// Create a model for the company schema
const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
