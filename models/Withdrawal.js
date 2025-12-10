const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  method: { type: String, enum: ['paypal', 'bank'], required: true },
  accountInfo: { type: String }, // البريد أو رقم البطاقة المسحوب إليها
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed' },
  createdAt: { type: Date, default: Date.now },
  paypalBatchId: { type: String }, // اختياري: رقم العملية من بايبال
  paypalPayoutItemId: { type: String }, // اختياري: رقم البند داخل الباتش
  // يمكن إضافة حقول أخرى حسب الحاجة
});

module.exports = mongoose.model('Withdrawal', withdrawalSchema);
