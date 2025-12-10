  const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const authMiddleware = require('../middleware/authMiddleware');
const User = require('../models/User');
const ManualWithdrawalRequest = require('../models/ManualWithdrawalRequest');
const adminMiddleware = require('../middleware/authAdminMiddleware'); // تأكد من وجوده
const { manualWithdrawalValidator } = require("../validators/manualWithdrawalValidator");
const validate = require('../middleware/validate');
const Withdrawal = require('../models/Withdrawal');


// ============== CLOUDINARY CONFIG ==============
const { v2: cloudinary } = require("cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});


// تخزين مؤقت للرفع (بدون كتابة للقرص)
const storage = multer.memoryStorage();
const upload = multer({ storage });




// إعداد تخزين الصورة
/*
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/bank-proofs/');
  },
  filename: function (req, file, cb) {
    
    cb(null, `proof_${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ storage });
*/
// 🔸 إنشاء طلب سحب يدوي
router.post('/', authMiddleware, upload.single('bankProof'), validate(manualWithdrawalValidator), async (req, res) => {
  try {
    const { amount, accountInfo } = req.body;
    let bankProofImage = "";

    // رفع الصورة إلى Cloudinary إن وجدت
   


    if (req.file) {
  bankProofImage = await new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'withdrawals' },
      (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result.secure_url);
        }
      }
    );
    uploadStream.end(req.file.buffer);
  });
}



    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: 'المبلغ غير صالح' });
    }

    if (!accountInfo || !accountInfo.trim()) {
      return res.status(400).json({ success: false, message: 'رقم الحساب البنكي مطلوب' });
    }

    const user = await User.findById(req.user.id);
    if (!user || user.commissionBalance < amount) {
      return res.status(400).json({ success: false, message: 'رصيد غير كافٍ' });
    }

    const request = new ManualWithdrawalRequest({
      user: user._id,
      amount,
      accountNumber: accountInfo,
      bankProofImage,
    });

    await request.save();

    user.commissionBalance -= amount;
    await user.save();

    res.json({ success: true, message: 'تم إرسال طلب السحب للمراجعة' });
  } catch (err) {
    console.error('Manual Withdraw Error:', err);
    return res.status(500).json({ success: false, message: 'خطأ في السيرفر', error: err.message });
  }
});
/*
router.post('/', authMiddleware, upload.single('bankProof'),validate(manualWithdrawalValidator), async (req, res) => {
  const { amount, accountInfo } = req.body;
  const bankProofImage = req.file?.path;

  try {
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: 'المبلغ غير صالح' });
    }

    if (!accountInfo || !accountInfo.trim()) {
      return res.status(400).json({ success: false, message: 'رقم الحساب البنكي مطلوب' });
    }

    const user = await User.findById(req.user.id);
    if (!user || user.commissionBalance < amount) {
      return res.status(400).json({ success: false, message: 'رصيد غير كافٍ' });
    }

    const request = new ManualWithdrawalRequest({
      user: user._id,
      amount,
      accountNumber: accountInfo,
      bankProofImage,
    });

    await request.save();

    // خصم المبلغ من الرصيد
    user.commissionBalance -= amount;
    await user.save();

    return res.json({ success: true, message: '✅ تم إرسال طلب السحب للمراجعة.' });
  } catch (err) {
    console.error('Manual Withdraw Error:', err);
    return res.status(500).json({ success: false, message: 'خطأ في السيرفر', error: err.message });
  }
});
*/

// 🔹 جلب طلبات المستخدم الخاصة به (للوحة المستخدم)
router.get('/my-requests', authMiddleware, async (req, res) => {
  try {
    const requests = await ManualWithdrawalRequest.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, requests });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
});










// ✅ جلب جميع الطلبات للمراجعة
router.get('/', adminMiddleware, async (req, res) => {
  try {
    const requests = await ManualWithdrawalRequest.find()
      .sort({ createdAt: -1 })
      .populate('user', 'username email');

    res.json({ success: true, requests });
  } catch (err) {
    console.error("❌ Error fetching manual withdrawals:", err);
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
});




// ✅ الموافقة على طلب
router.post('/:id/approve', adminMiddleware, async (req, res) => {
  try {
    const request = await ManualWithdrawalRequest.findById(req.params.id).populate('user');
    if (!request) {
      return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    }

    // تأكيد أنه لم تتم الموافقة مسبقًا
    if (request.status === 'approved') {
      return res.status(400).json({ success: false, message: 'تمت الموافقة على هذا الطلب مسبقًا' });
    }

    request.status = 'approved';
    await request.save();

    // 🟢 حفظ بيانات السحب في Withdrawal
    const withdrawal = new Withdrawal({
      user: request.user._id,
      amount: request.amount,
      method: 'bank', // ← أو 'manual-bank'
      accountInfo: request.accountNumber,
      status: 'completed', // بما أن التحويل تم يدويًا من طرف الأدمن
      bankProofImage: request.bankProofImage || '', // إذا أردت تضمين الإثبات
    });
     

    await withdrawal.save();

    res.json({ success: true, message: '✅ تمت الموافقة على الطلب وتم حفظ عملية السحب' });
  } catch (err) {
    console.error("❌ Approve Error:", err);
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
});

/*
router.post('/:id/approve', adminMiddleware, async (req, res) => {
  try {
    const request = await ManualWithdrawalRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    }

    request.status = 'approved';
    await request.save();

    res.json({ success: true, message: '✅ تمت الموافقة على الطلب' });
  } catch (err) {
    console.error("❌ Approve Error:", err);
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
});
*/





// ✅ رفض الطلب
router.post('/:id/reject', adminMiddleware, async (req, res) => {
  try {
    const request = await ManualWithdrawalRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
    }

    request.status = 'rejected';
    await request.save();

    // إرجاع المبلغ لرصيد المستخدم
    const user = await User.findById(request.user);
    if (user) {
      user.commissionBalance += request.amount;
      await user.save();
    }

    res.json({ success: true, message: '❌ تم رفض الطلب وتم استرجاع الرصيد' });
  } catch (err) {
    console.error("❌ Reject Error:", err);
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
});








module.exports = router;

