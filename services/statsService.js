



const StatsPeriod = require("../models/StatsPeriod");

// دالة لحساب بداية ونهاية اليوم
function getDayRange(date) {
  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const endOfDay = new Date(startOfDay);
  endOfDay.setHours(23, 59, 59, 999);
  return { period: "day", startDate: startOfDay, endDate: endOfDay };
}

// دالة لحساب بداية ونهاية الأسبوع
function getWeekRange(date) {
  const startOfWeek = new Date(date);
  startOfWeek.setDate(date.getDate() - date.getDay()); // بداية الأسبوع (الأحد)
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);





  return { period: "week", startDate: startOfWeek, endDate: endOfWeek };
}

// دالة لحساب بداية ونهاية الشهر
function getMonthRange(date) {
  const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  endOfMonth.setHours(23, 59, 59, 999);
  return { period: "month", startDate: startOfMonth, endDate: endOfMonth };
}

// دالة لحساب الإيرادات بناءً على نوع الاشتراك
function getSubscriptionRevenue(subscriptionType) {
  const planPrices = { pro: 2.99, premium: 4.99, basic: 0 };
  return planPrices[subscriptionType] || 0;
}

// تحديث الإحصاءات لكل فترة (اليوم، الأسبوع، الشهر)
async function updateStatsPeriod(eventType, subscriptionType) {
  const now = new Date();
  const ranges = [getDayRange(now), getWeekRange(now), getMonthRange(now)];

  for (const range of ranges) {
    let stats = await StatsPeriod.findOne({
      period: range.period,
      startDate: range.startDate,
      endDate: range.endDate,
    });

    if (stats) {
      if (eventType === "newUser") {
        stats.newUsers += 1;
        stats.totalUsers += 1;
      }

      if (eventType === "newSubscription") {
        stats.totalSubscriptions[subscriptionType] += 1;
        stats.totalRevenue += getSubscriptionRevenue(subscriptionType);
      }

      await stats.save();
    } else {
      const newStats = new StatsPeriod({
        period: range.period,
        startDate: range.startDate,
        endDate: range.endDate,
        newUsers: eventType === "newUser" ? 1 : 0,
        totalUsers: eventType === "newUser" ? 1 : 0,
        totalSubscriptions: { basic: 0, pro: 0, premium: 0 },
        totalRevenue: eventType === "newSubscription" ? getSubscriptionRevenue(subscriptionType) : 0,
      });

      await newStats.save();
    }
  }
}


module.exports = { updateStatsPeriod };
