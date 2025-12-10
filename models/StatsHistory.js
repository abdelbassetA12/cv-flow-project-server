const mongoose = require("mongoose");

const statsHistorySchema = new mongoose.Schema({
  totalUsersEver: { type: Number, default: 0 },           // جميع الحسابات منذ البداية
  paidSubscriptionsEver: { type: Number, default: 0 },    // كل الاشتراكات المدفوعة التي تمت
   totalRevenueEver: { type: Number, default: 0 },         // 💰 إجمالي الأرباح من الاشتراكات
  createdAt: { type: Date, default: Date.now },        // لحفظ تاريخ التسجيل
 
});

module.exports = mongoose.model("StatsHistory", statsHistorySchema);

