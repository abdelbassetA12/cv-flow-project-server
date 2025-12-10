const express = require("express");
const User = require("../models/User");
const StatsHistory = require("../models/StatsHistory");
const StatsPeriod = require("../models/StatsPeriod");


const authAdminMiddleware = require("../middleware/authAdminMiddleware"); // 🛡️ خلي الإحصاءات للأدمن فقط
const router = express.Router();


// 📊 راوت واحد لجميع الإحصاءات
router.get("/overview", authAdminMiddleware, async (req, res) => {
  try {
    const verifiedUsersCount = await User.countDocuments({ isVerified: true });
    const totalUsers = await User.countDocuments();

    const plans = ["basic", "pro", "premium"];
    const subscriptions = {};
    for (const plan of plans) {
      subscriptions[plan] = await User.countDocuments({ subscriptionPlan: plan });
    }

     // 🔹 إجمالي المشتركين المدفوعين
    const paidSubscribers = (subscriptions.pro || 0) + (subscriptions.premium || 0);

    // 🔹 حساب الأرباح من الاشتراكات عبر PayPal (بناءً على السعر × عدد المشتركين)
    const planPrices = { pro: 2.99, premium: 4.99, basic: 0 };
    let paypalRevenue = 0;
    for (const plan of ["pro", "premium"]) {
      const count = subscriptions[plan] || 0;
      paypalRevenue += count * planPrices[plan];
    }

   

    // 🔹 الربح الكلي
    const totalRevenue = paypalRevenue 

    res.json({
      verifiedUsersCount,
      totalUsers,
      subscriptions,
       paidSubscribers, // 👈 هنا أضفناه
      totalRevenue
    });
  } catch (err) {
    console.error("Overview stats error:", err);
    res.status(500).json({ message: "حدث خطأ أثناء جلب إحصائيات الموقع" });
  }
});






router.get("/stats-history", authAdminMiddleware, async (req, res) => {
  try {
    const history = await StatsHistory.find().sort({ createdAt: -1 });
    res.json(history);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "حدث خطأ أثناء جلب الإحصاءات التاريخية" });
  }
});













router.get("/stats-periods", authAdminMiddleware, async (req, res) => {
  try {
    const now = new Date();

    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const todayStats = await StatsPeriod.findOne({ period: "day", startDate: startOfDay });
   // const weekStats = await StatsPeriod.findOne({ period: "week", startDate: startOfWeek });
    const weekStats = await StatsPeriod.findOne({
      period: "week",
      startDate: { $lte: now },
      endDate: { $gte: now },
    });
    const monthStats = await StatsPeriod.findOne({ period: "month", startDate: startOfMonth });

    res.json({
      today: todayStats || { totalUsers: 0, totalSubscriptions: 0, totalRevenue: 0 },
      week: weekStats || { totalUsers: 0, totalSubscriptions: 0, totalRevenue: 0 },
      month: monthStats || { totalUsers: 0, totalSubscriptions: 0, totalRevenue: 0 },
    });
  } catch (err) {
    console.error("Error fetching stats periods:", err);  // طباعة الخطأ في السيرفر
    res.status(500).json({ message: "خطأ في الخادم أثناء استرجاع الإحصائيات." });
  }
});






module.exports = router;
