const mongoose = require("mongoose");

const statsPeriodSchema = new mongoose.Schema({
  period: { type: String, required: true },  // "day", "week", "month"
  startDate: { type: Date, required: true },  // تاريخ بداية الفترة
  endDate: { type: Date, required: true },    // تاريخ نهاية الفترة
  totalUsers: { type: Number, default: 0 },
  newUsers: { type: Number, default: 0 },
  totalSubscriptions: {
    basic: { type: Number, default: 0 },
    pro: { type: Number, default: 0 },
    premium: { type: Number, default: 0 },
  },
  totalRevenue: { type: Number, default: 0 },
});

module.exports = mongoose.model("StatsPeriod", statsPeriodSchema);
