const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');
const crypto = require('crypto');

// 🔹 توليد كود إحالة فريد
function generateReferralCode() {
  return crypto.randomBytes(3).toString('hex'); // مثال: "a1b2c3"
}

// 🔸 عند التسجيل (هذا يتم في ملف authRoutes.js)، يجب إنشاء كود إحالة فريد:
async function assignReferralCode(user) {
  let code;
  let exists = true;

  while (exists) {
    code = generateReferralCode();
    exists = await User.findOne({ referralCode: code });
  }

  user.referralCode = code;
  await user.save();
}

// ✅ إرجاع كود الإحالة الخاص بالمستخدم
router.get('/my-code', authMiddleware, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user.referralCode) {
    await assignReferralCode(user);
  }
  res.json({ referralCode: user.referralCode });
});

// ✅ إرجاع الأرباح من الإحالات
// ✅ إرجاع الأرباح من الإحالات
router.get('/my-earnings', authMiddleware, async (req, res) => {
  const user = await User.findById(req.user.id);
  res.json({ earnings: user.commissionBalance || 0 });
});









// ✅ إرجاع عدد الإحالات الكلية وعدد المشتركين المدفوعين
router.get('/referrals', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.referralCode) {
      return res.json({ totalReferrals: 0, paidReferrals: 0 });
    }

    const myCode = user.referralCode;

    const totalReferrals = await User.countDocuments({ referredBy: myCode });
    const paidReferrals = await User.countDocuments({ referredBy: myCode, isSubscribed: true }); // ⚠️ تأكد أن isSubscribed موجود فعلاً

    res.json({ totalReferrals, paidReferrals });
  } catch (err) {
    res.status(500).json({ error: 'حدث خطأ أثناء جلب بيانات الإحالات' });
  }
});




module.exports = router;
