// models/SavedProject.js
const mongoose = require('mongoose');

const SavedProjectSchema = new mongoose.Schema({
  name: { type: String, default: 'مشروع بدون اسم' }, // 👈 بدل required
  data: { type: String, required: true }, // JSON الناتج من Fabric.js
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('SavedProject', SavedProjectSchema);
