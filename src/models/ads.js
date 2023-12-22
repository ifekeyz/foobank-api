const mongoose = require('mongoose');


const adsSchema = new mongoose.Schema({
  name: { type: String, default: "" },
  email: { type: String, default: "" }
});


const Ads = mongoose.model('Ads', adsSchema);

module.exports = Ads;
