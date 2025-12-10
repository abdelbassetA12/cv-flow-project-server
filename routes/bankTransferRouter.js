const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const ManualTransfer = require('../models/ManualTransfer');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/authAdminMiddleware'); // نضيفه للتحقق من صلاحية الأدمن
const { updateStatsPeriod } = require("../services/statsService");
const { v2: cloudinary } = require("cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});



// Multer لتخزين الملفات في الذاكرة مؤقتًا
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const ext = file.originalname.split('.').pop().toLowerCase();
    const mime = file.mimetype;
    if (allowedTypes.test(ext) && allowedTypes.test(mime)) cb(null, true);
    else cb(new Error('❌ نوع الملف غير مسموح. يُسمح فقط بـ JPG أو PNG'));
  }
});





/*
// إعداد تخزين الملفات
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '..', 'uploads', 'transfers');
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});
*/
/*
const upload = multer({ storage });
*/
/*
const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 }, // الحد الأقصى 3MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype;

    if (allowedTypes.test(ext) && allowedTypes.test(mime)) {
      cb(null, true);
    } else {
      cb(new Error('❌ نوع الملف غير مسموح. يُسمح فقط بـ JPG أو PNG'));
    }
  }
});
*/




/**
 * 📥 المستخدم يرسل صورة التحويل البنكي
 */


router.post('/upload', authMiddleware, upload.single('screenshot'), async (req, res) => {
  try {
    const { plan, price } = req.body;
    if (!req.file) return res.status(400).json({ success: false, message: 'لم يتم تحميل الصورة' });

    const planPrices = { basic: 0, pro: 2.99, premium: 4.99 };
    if (!planPrices[plan]) return res.status(400).json({ success: false, message: 'خطة غير صالحة' });
    if (Number(price) !== planPrices[plan]) return res.status(400).json({ success: false, message: 'السعر المرسل لا يطابق سعر الخطة' });

    const user = await User.findById(req.user.id);
    const now = new Date();
    if (user.subscriptionPlan === plan && user.subscriptionPlan !== 'basic' && user.subscriptionExpiresAt && now < user.subscriptionExpiresAt) {
      return res.status(400).json({
        success: false,
        message: '🚫 أنت مشترك حاليًا في هذه الخطة بالفعل. لا يمكن الاشتراك مجددًا قبل انتهاء الاشتراك الحالي.',
      });
    }

    // رفع الصورة إلى Cloudinary
    const result = await cloudinary.uploader.upload_stream(
      { folder: "transfers" },
      async (error, uploaded) => {
        if (error) return res.status(500).json({ success: false, message: 'فشل رفع الصورة على Cloudinary', error });

        const newTransfer = new ManualTransfer({
          userId: req.user.id,
          plan,
          price: planPrices[plan],
          screenshot: uploaded.secure_url, // URL من Cloudinary
          status: 'pending',
          createdAt: now,
        });

        await newTransfer.save();
        res.json({ success: true, message: 'تم استلام التحويل، بانتظار المراجعة' });
      }
    );

    // تمرير buffer إلى Cloudinary
    result.end(req.file.buffer);

  } catch (error) {
    console.error('❌ فشل رفع التحويل البنكي:', error);
    res.status(500).json({ success: false, message: 'فشل داخلي في السيرفر' });
  }
});
/*
router.post('/upload', authMiddleware, upload.single('screenshot'), async (req, res) => {
  try {
    const { plan, price } = req.body;
    if (!req.file) return res.status(400).json({ success: false, message: 'لم يتم تحميل الصورة' });

    // تحديد أسعار الخطط مباشرة
    const planPrices = {
      basic: 0,
      pro: 2.99,
      premium: 4.99,
    };

    // التحقق من صحة الخطة
    if (!planPrices[plan]) {
      return res.status(400).json({ success: false, message: 'خطة غير صالحة' });
    }

    // التحقق من تطابق السعر مع الخطة
    if (Number(price) !== planPrices[plan]) {
      return res.status(400).json({ success: false, message: 'السعر المرسل لا يطابق سعر الخطة' });
    }

    const user = await User.findById(req.user.id);
    const now = new Date();

    // منع الاشتراك بنفس الخطة قبل انتهاء الاشتراك الحالي
    if (
      user.subscriptionPlan === plan &&
      user.subscriptionPlan !== 'basic' &&
      user.subscriptionExpiresAt &&
      now < user.subscriptionExpiresAt
    ) {
      return res.status(400).json({
        success: false,
        message: '🚫 أنت مشترك حاليًا في هذه الخطة بالفعل. لا يمكن الاشتراك مجددًا قبل انتهاء الاشتراك الحالي.',
      });
    }

    const newTransfer = new ManualTransfer({
      userId: req.user.id,
      plan,
      price: planPrices[plan], // استخدام السعر الصحيح
      screenshot: `uploads/transfers/${req.file.filename}`,
      status: 'pending',
      createdAt: now,
    });

    await newTransfer.save();
    res.json({ success: true, message: 'تم استلام التحويل، بانتظار المراجعة' });
  } catch (error) {
    console.error('❌ فشل رفع التحويل البنكي:', error);
    res.status(500).json({ success: false, message: 'فشل داخلي في السيرفر' });
  }
});
*/






router.get('/pending', adminMiddleware, async (req, res) => {
  try {
    const transfers = await ManualTransfer.find({ status: 'pending' }).populate('userId', 'email subscriptionPlan');
    res.json({ success: true, transfers });
  } catch (error) {
    console.error('❌ خطأ أثناء جلب التحويلات:', error);
    res.status(500).json({ success: false, message: 'خطأ أثناء جلب التحويلات' });
  }
});


/**
 * ✅ الأدمن يوافق على التحويل ويفعّل الاشتراك للمستخدم
 */
router.post('/approve/:id', adminMiddleware, async (req, res) => {
  try {
    const transferId = req.params.id;
    const transfer = await ManualTransfer.findById(transferId);
    if (!transfer || transfer.status !== 'pending') return res.status(404).json({ success: false, message: 'طلب غير صالح أو تم مراجعته بالفعل' });

    const user = await User.findById(transfer.userId);
    if (!user) return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });

    const wasBasic = user.subscriptionPlan === 'basic';

    // ✅ تحديث بيانات الاشتراك
    user.subscriptionPlan = transfer.plan;
    user.isSubscribed = true;

    const now = new Date();
    user.subscriptionStartDate = now;
    const duration = 30;
    user.subscriptionExpiresAt = new Date(now.getTime() + duration * 24 * 60 * 60 * 1000);

    // ✅ منح عمولة إذا كان مستخدم مُحال
    if (user.referredBy && wasBasic) {
      const referrer = await User.findOne({ referralCode: user.referredBy });
      if (referrer) {
        const commissionRate = 0.3;
        const commission = Number(transfer.price) * commissionRate;
        referrer.commissionBalance += commission;
        await referrer.save();
        console.log(`💸 عمولة ${commission}$ تمت إضافتها لـ ${referrer.email}`);
      }
    }

    // ✅ تحديث حالة التحويل
    transfer.status = 'approved';
    await transfer.save();
    await user.save();






    // 🔹 تحديث الإحصاءات تلقائيًا عند الاشتراك الجديد
const StatsHistory = require('../models/StatsHistory');
const lastStats = await StatsHistory.findOne().sort({ createdAt: -1 });

const newStats = new StatsHistory({
  totalUsersEver: lastStats?.totalUsersEver || (await User.countDocuments()),
  
  paidSubscriptionsEver: (lastStats?.paidSubscriptionsEver || 0) + 1,
  totalRevenueEver: (lastStats?.totalRevenueEver || 0) + Number(transfer.price) // 💰 أضف الربح
});


await newStats.save();



    // بعد تحديث اشتراك المستخدم
await updateStatsPeriod("newSubscription", user.subscriptionPlan);





    res.json({ success: true, message: 'تم تفعيل اشتراك المستخدم' });
  } catch (error) {
    console.error('❌ خطأ أثناء التفعيل:', error);
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
});

/**
 * ❌ رفض التحويل
 */
router.post('/reject/:id',  adminMiddleware, async (req, res) => {
  try {
    const transfer = await ManualTransfer.findById(req.params.id);
    if (!transfer || transfer.status !== 'pending') {
      return res.status(404).json({ success: false, message: 'طلب غير موجود أو تم مراجعته' });
    }

    transfer.status = 'rejected';
    await transfer.save();

    res.json({ success: true, message: 'تم رفض التحويل' });
  } catch (error) {
    console.error('❌ فشل في رفض التحويل:', error);
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
});

module.exports = router;
