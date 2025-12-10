



const express = require('express');
const router = express.Router();

const fetch = (...args) => import('node-fetch').then(mod => mod.default(...args));

const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
//const base = 'https://api-m.sandbox.paypal.com'; 
const base = process.env.PAYPAL_LIVE_URL;     // ← استبدله بـ live لاحقًا


// 🔐 الحصول على توكن OAuth من PayPal
async function getAccessToken() {
  const response = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const data = await response.json();
  return data.access_token;
}

// 🧾 إنشاء طلب دفع
router.post('/create-order', async (req, res) => {
  const { plan } = req.body; // 'pro' أو 'premium'

  const plans = {
    pro: 2.99,
    premium: 4.99,
  };

  const amount = plans[plan];
  if (!amount) return res.status(400).json({ message: 'خطة غير صالحة' });

  const accessToken = await getAccessToken();

  const response = await fetch(`${base}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{ amount: { currency_code: 'USD', value: amount.toFixed(2) } }],
    }),
  });

  const data = await response.json();
  res.json(data);
});



// ✅ تأكيد الدفع وتحديث الاشتراك والعمولة
router.post('/capture-order', authMiddleware, async (req, res) => {
  const { orderID, plan } = req.body;
  const accessToken = await getAccessToken();

  const user = await User.findById(req.user.id);

  // ✅ تحقق من أن المستخدم يحاول الاشتراك في نفس الخطة المدفوعة ولم ينته اشتراكه بعد
  const now = new Date();
  if (
    user.subscriptionPlan === plan &&
    user.subscriptionPlan !== 'basic' &&
    user.subscriptionExpiresAt &&
    now < user.subscriptionExpiresAt
  ) {
    return res.status(400).json({ success: false, message: '🚫 أنت مشترك حاليًا في هذه الخطة بالفعل.' });
  }

  // ⬇️ تنفيذ الدفع
  const response = await fetch(`${base}/v2/checkout/orders/${orderID}/capture`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  const data = await response.json();

  if (data.status === 'COMPLETED') {
    const wasBasic = user.subscriptionPlan === 'basic';

    user.subscriptionPlan = plan;
    user.subscriptionStartDate = now;

    const durationInDays = 30;
    const expiryDate = new Date(now.getTime() + durationInDays * 24 * 60 * 60 * 1000);
    user.subscriptionExpiresAt = expiryDate;
    user.isSubscribed = true;

    // ✅ منح عمولة للمحيل فقط إذا كانت هذه أول ترقية من خطة basic
    if (user.referredBy && wasBasic) {
      const referrer = await User.findOne({ referralCode: user.referredBy });

      if (referrer) {
        const planPrices = { pro: 2.99, premium: 4.99 };
        const commissionRate = 0.30;
        const planPrice = planPrices[plan] || 0;
        const commissionAmount = planPrice * commissionRate;

        referrer.commissionBalance += commissionAmount;
        await referrer.save();

        console.log(`🎉 تمت إضافة عمولة للمحيل ${referrer.email} (${commissionAmount}$)`);
      }
    }

    await user.save();






      // 🔹 تحديث الإحصاءات تلقائيًا عند الاشتراك الجديد
  const StatsHistory = require('../models/StatsHistory');
  const lastStats = await StatsHistory.findOne().sort({ createdAt: -1 });
  const planPrices = { pro: 2.99, premium: 4.99 }; // أسعار الخطط
const planPrice = planPrices[plan] || 0;
  
  const newStats = new StatsHistory({
    totalUsersEver: lastStats?.totalUsersEver || (await User.countDocuments()),
    
    paidSubscriptionsEver: (lastStats?.paidSubscriptionsEver || 0) + 1,
   
    totalRevenueEver: (lastStats?.totalRevenueEver || 0) + planPrice, // ✅ استخدام سعر الخطة الصحيح
  });

  await newStats.save();








    return res.json({ success: true, newPlan: plan });
  } else {
    return res.status(400).json({ success: false, message: 'فشل الدفع' });
  }
});






module.exports = router;
