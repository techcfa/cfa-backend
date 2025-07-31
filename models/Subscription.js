const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  planId: {
    type: String,
    required: true,
    unique: true
  },
  planName: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  duration: {
    type: Number, // in months
    required: true
  },
  maxMembers: {
    type: Number,
    default: 1
  },
  features: [{
    type: String
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isSpecialOffer: {
    type: Boolean,
    default: false
  },
  specialPrice: {
    type: Number
  },
  validFrom: Date,
  validTo: Date
}, {
  timestamps: true
});

module.exports = mongoose.model('Subscription', subscriptionSchema); 