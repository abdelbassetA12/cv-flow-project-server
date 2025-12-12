// server/routes/analyticsRoutes.js
const express = require("express");
const { BetaAnalyticsDataClient } = require("@google-analytics/data");
const path = require("path");
const NodeCache = require("node-cache");
const authAdminMiddleware = require("../middleware/authAdminMiddleware");

const router = express.Router();



// ==== إعدادات - عدل حسب بيئتك أو ضعها في .env ====
//const KEYFILE_PATH = process.env.GA_KEYFILE || path.join(__dirname, "../config/cv-folow-03800dbe6041.json");
// تحميل JSON من متغير البيئة GA_SERVICE_ACCOUNT
const serviceAccount = JSON.parse(process.env.GA_SERVICE_ACCOUNT);
const PROPERTY_ID = process.env.GA_PROPERTY_ID || "504891179";
const CACHE_TTL_SECONDS = parseInt(process.env.GA_CACHE_TTL || "60", 10); // كاش عام (60s)

// ==== عميل Google Analytics Data API ====
/*
const analytics = new BetaAnalyticsDataClient({
  keyFilename: KEYFILE_PATH,
});*/

const analytics = new BetaAnalyticsDataClient({
  credentials: {
    client_email: serviceAccount.client_email,
    private_key: serviceAccount.private_key,
  },
});

// ==== كاش بسيط في الذاكرة ====
const cache = new NodeCache({ stdTTL: CACHE_TTL_SECONDS, checkperiod: 120 });

// ==== Helpers ====
function getCached(key) {
  return cache.get(key);
}
function setCached(key, value, ttl = CACHE_TTL_SECONDS) {
  cache.set(key, value, ttl);
}
function safeMetricFromResponse(response, metricIndex = 0, rowIndex = 0) {
  return (response && response.rows && response.rows[rowIndex] && response.rows[rowIndex].metricValues && response.rows[rowIndex].metricValues[metricIndex] && response.rows[rowIndex].metricValues[metricIndex].value) || 0;
}

// ==== ROUTES ====

// 1) Overview (زي بطاقات KPI)
router.get("/overview", authAdminMiddleware, async (req, res) => {
  try {
    const cacheKey = "overview_v1";
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    // زوار اليوم (activeUsers اليوم)
    const [visRes] = await analytics.runReport({
      property: `properties/${PROPERTY_ID}`,
      dateRanges: [{ startDate: "today", endDate: "today" }],
      metrics: [{ name: "activeUsers" }],
    });
    const visitorsToday = safeMetricFromResponse(visRes, 0, 0);

    // جلسات آخر 7 أيام (sessions)
    const [sessRes] = await analytics.runReport({
      property: `properties/${PROPERTY_ID}`,
      dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
      metrics: [{ name: "sessions" }],
    });
    const sessionsWeek = safeMetricFromResponse(sessRes, 0, 0);

    const payload = { visitorsToday: Number(visitorsToday), sessionsWeek: Number(sessionsWeek) };
    setCached(cacheKey, payload, 30); // cache 30s
    res.json(payload);
  } catch (err) {
    console.error("Error /overview:", err);
    res.status(500).json({ error: err.message || "GA overview failed" });
  }
});

// 2) Sessions per day (last 7 days) -> line chart
router.get("/daily-sessions", authAdminMiddleware, async (req, res) => {
  try {
    const cacheKey = "daily-sessions-7days";
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const [response] = await analytics.runReport({
      property: `properties/${PROPERTY_ID}`,
      dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
      dimensions: [{ name: "date" }],
      metrics: [{ name: "sessions" }],
      orderBys: [{ dimension: { dimensionName: "date" } }],
    });

    const data =
      (response.rows || []).map((r) => ({
        date: r.dimensionValues?.[0]?.value || "",
        sessions: Number(r.metricValues?.[0]?.value || 0),
      })) || [];

    setCached(cacheKey, data, 60);
    res.json(data);
  } catch (err) {
    console.error("Error /daily-sessions:", err);
    res.status(500).json({ error: err.message || "GA daily sessions failed" });
  }
});

// 3) Top countries (last 30 days)
router.get("/top-countries", authAdminMiddleware, async (req, res) => {
  try {
    const cacheKey = "top-countries-30d";
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const [response] = await analytics.runReport({
      property: `properties/${PROPERTY_ID}`,
      dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
      dimensions: [{ name: "country" }],
      metrics: [{ name: "sessions" }],
      orderBys: [{ desc: true, metric: { metricName: "sessions" } }],
      limit: 10,
    });

    const countries = (response.rows || []).map((r) => ({
      country: r.dimensionValues?.[0]?.value || "Unknown",
      sessions: Number(r.metricValues?.[0]?.value || 0),
    }));

    setCached(cacheKey, countries, 300); // 5 min
    res.json(countries);
  } catch (err) {
    console.error("Error /top-countries:", err);
    res.status(500).json({ error: err.message || "GA top countries failed" });
  }
});

// 4) Top devices (last 30 days)
router.get("/top-devices", authAdminMiddleware, async (req, res) => {
  try {
    const cacheKey = "top-devices-30d";
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const [response] = await analytics.runReport({
      property: `properties/${PROPERTY_ID}`,
      dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
      dimensions: [{ name: "deviceCategory" }],
      metrics: [{ name: "sessions" }],
      orderBys: [{ desc: true, metric: { metricName: "sessions" } }],
      limit: 10,
    });

    const devices = (response.rows || []).map((r) => ({
      device: r.dimensionValues?.[0]?.value || "Unknown",
      sessions: Number(r.metricValues?.[0]?.value || 0),
    }));

    setCached(cacheKey, devices, 300);
    res.json(devices);
  } catch (err) {
    console.error("Error /top-devices:", err);
    res.status(500).json({ error: err.message || "GA top devices failed" });
  }
});

// 5) Realtime active users

router.get("/realtime-active-users", authAdminMiddleware, async (req, res) => {
  try {
    const cacheKey = "realtime-active-users";
    const cached = getCached(cacheKey);
    if (cached !== undefined) return res.json({ activeUsers: cached });

    const [response] = await analytics.runRealtimeReport({
      property: `properties/${PROPERTY_ID}`,
      metrics: [{ name: "activeUsers" }],
    });

    const activeUsers = safeMetricFromResponse(response, 0, 0);
    setCached(cacheKey, Number(activeUsers), 10); // cache 10s
    res.json({ activeUsers: Number(activeUsers) });
  } catch (err) {
    console.error("Error /realtime-active-users:", err);
    // If the call fails with INVALID_ARGUMENT or unsupported dimension, return safe default
    res.status(500).json({ error: err.message || "GA realtime failed", activeUsers: 0 });
  }
});













module.exports = router;






