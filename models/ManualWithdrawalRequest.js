// models/ManualWithdrawalRequest.js
const mongoose = require('mongoose');

const manualWithdrawalSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  accountNumber: { type: String, required: true }, // رقم الحساب البنكي
  bankProofImage: { type: String }, // مسار صورة كشف الحساب البنكي
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  reviewedAt: { type: Date }, // وقت مراجعة الطلب
  adminNote: { type: String }, // ملاحظة إدارية اختيارية
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ManualWithdrawalRequest', manualWithdrawalSchema);
