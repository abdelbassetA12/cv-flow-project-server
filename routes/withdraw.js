
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const User = require('../models/User');
const Withdrawal = require('../models/Withdrawal');
const { withdrawalValidator } = require("../validators/manualWithdrawalValidator");
const validate = require('../middleware/validate');


const fetch = (...args) => import('node-fetch').then(mod => mod.default(...args));

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
//const base = 'https://api-m.sandbox.paypal.com';    
const base = process.env.PAYPAL_LIVE_URL;     // ← استبدله بـ live لاحقًا

async function getAccessToken() {
  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = await res.json();
  return data.access_token;
}

router.post('/', authMiddleware,validate(withdrawalValidator), async (req, res) => {
  const { amount, method, accountInfo } = req.body;

  try {
    const user = await User.findById(req.user.id);

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: 'المبلغ غير صالح' });
    }

    if (user.commissionBalance < amount) {
      return res.status(400).json({ success: false, message: 'رصيد غير كافٍ' });
    }

    if (!method || !accountInfo || !accountInfo.trim()) {
      return res.status(400).json({ success: false, message: 'يرجى تحديد طريقة السحب وإدخال البيانات المطلوبة' });
    }

    if (method === 'paypal') {
      // تحقق من وجود paypalEmail في حساب المستخدم أو استخدم accountInfo الذي أدخله المستخدم (مرونة)
      const receiverEmail = user.paypalEmail && user.paypalEmail.trim() !== '' ? user.paypalEmail : accountInfo.trim();
      if (!receiverEmail) {
        return res.status(400).json({ success: false, message: 'لم تقم بإدخال بريد PayPal في حسابك' });
      }

      const accessToken = await getAccessToken();

      const payoutRes = await fetch(`${base}/v1/payments/payouts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender_batch_header: {
            sender_batch_id: `batch_${Date.now()}`,
            email_subject: "You've received a payout!",
          },
          items: [
            {
              recipient_type: 'EMAIL',
              amount: {
                value: amount.toFixed(2),
                currency: 'USD',
              },
              note: 'عمولتك من الإحالات 🎉',
              sender_item_id: `item_${Date.now()}`,
              receiver: receiverEmail,
            },
          ],
        }),
      });

      const payoutData = await payoutRes.json();



    









      if (payoutRes.status === 201 || payoutRes.status === 200) {
  // احفظ بيانات السحب في قاعدة البيانات
  const payoutItem = payoutData.items && payoutData.items[0];

  const withdrawal = new Withdrawal({
    user: user._id,
    amount,
    method,
    accountInfo: receiverEmail,
    status: 'completed',
    paypalBatchId: payoutData.batch_header?.payout_batch_id || '',
    paypalPayoutItemId: payoutItem?.payout_item_id || '',
  });

  await withdrawal.save();

  // تحديث رصيد المستخدم بعد الحفظ
  user.commissionBalance -= amount;
  await user.save();

  return res.json({
    success: true,
    message: `✅ تم تحويل ${amount}$ إلى حساب PayPal الخاص بك (${receiverEmail})`,
    data: payoutData,
  });
}
   else {
        return res.status(500).json({ success: false, message: 'فشل التحويل', data: payoutData });
      }
    } else if (method === 'bank') {
      // هنا يمكنك وضع منطق السحب عبر البطاقة البنكية إذا كنت تدعمه
      return res.status(400).json({ success: false, message: 'طريقة السحب عبر البطاقة غير مفعلة حالياً' });
    } else {
      return res.status(400).json({ success: false, message: 'طريقة سحب غير معروفة' });
    }
  } catch (err) {
    console.error('Withdrawal Error:', err);
    return res.status(500).json({ success: false, message: 'خطأ في السيرفر', error: err.message });
  }
});





router.get('/my-withdrawals', authMiddleware, async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find({ user: req.user.id }).sort({ createdAt: -1 });

    // حساب إجمالي السحب
    const totalWithdrawn = withdrawals.reduce((sum, w) => sum + w.amount, 0);

    res.json({
      success: true,
      withdrawals,
      totalWithdrawn,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
});


module.exports = router;


