
// للكوكي
const jwt = require('jsonwebtoken');
const User = require('../models/User');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;

async function authMiddleware(req, res, next) {
  try {
    // 🔹 قراءة التوكن من الكوكي
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ message: '⛔ غير مصرح' });

    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.id).select(
      'username email subscriptionPlan isVerified isSubscribed subscriptionExpiresAt'
    );

    if (!user) return res.status(401).json({ message: '❌ المستخدم غير موجود' });

    if (!user.isVerified) {
      return res.status(403).json({ message: '⚠️ لم يتم تفعيل البريد الإلكتروني بعد' });
    }

    // 🔹 التحقق من انتهاء الاشتراك
    const now = new Date();
    if (user.subscriptionExpiresAt && now > user.subscriptionExpiresAt) {
      user.isSubscribed = false;
      user.subscriptionPlan = "basic"; // تحديث الخطة تلقائيًا عند الانتهاء
      await user.save();
    }

    req.user = {
      id: user._id,
      username: user.username,
      email: user.email,
      subscriptionPlan: user.subscriptionPlan,
      isVerified: user.isVerified,
      isSubscribed: user.isSubscribed,
      subscriptionExpiresAt: user.subscriptionExpiresAt,
    };

    next();
  } catch (err) {
    console.error('authMiddleware error:', err);
    return res.status(403).json({ message: '❌ توكن غير صالح' });
  }
}

module.exports = authMiddleware;





/*
const jwt = require('jsonwebtoken');
const User = require('../models/User');
//const StatsHistory = require('../models/StatsHistory');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;

async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: '⛔ غير مصرح' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const user = await User.findById(decoded.id).select(
      'username email subscriptionPlan isVerified isSubscribed subscriptionExpiresAt'
    );

    if (!user) return res.status(401).json({ message: '❌ المستخدم غير موجود' });

    if (!user.isVerified) {
      return res.status(403).json({ message: '⚠️ لم يتم تفعيل البريد الإلكتروني بعد' });
    }

   


    const now = new Date();
if (user.subscriptionExpiresAt && now > user.subscriptionExpiresAt) {
  user.isSubscribed = false;
  user.subscriptionPlan = "basic"; // تحديث الخطة تلقائيًا عند الانتهاء
  await user.save();
}






    req.user = {
      id: user._id,
      username: user.username,
      email: user.email,
      subscriptionPlan: user.subscriptionPlan,
      isVerified: user.isVerified,
      isSubscribed: user.isSubscribed,
      subscriptionExpiresAt: user.subscriptionExpiresAt,
    };

    next();
  } catch (err) {
    console.error('authMiddleware error:', err);
    return res.status(403).json({ message: '❌ توكن غير صالح' });
  }
}

module.exports = authMiddleware;
*/







