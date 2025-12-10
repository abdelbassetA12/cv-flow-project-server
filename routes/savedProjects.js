// routes/savedProjects.js
const express = require('express');
const router = express.Router();
const SavedProject = require('../models/SavedProject');
const authMiddleware = require('../middleware/authMiddleware');
const limits = require('../config/subscriptionLimits');

// ✅ إنشاء مشروع جديد



// 🟢 إنشاء مشروع جديد مع التحقق من الخطة
router.post('/', authMiddleware, async (req, res) => {
  const { name, data } = req.body;

  try {
    const userPlan = req.user.subscriptionPlan;  // الخطة من JWT
    const maxProjects = limits[userPlan];         // الحد المسموح به

    // عدد المشاريع الحالية
    const count = await SavedProject.countDocuments({
      createdBy: req.user.id
    });

    // ❌ إذا تجاوز الحد يتم منعه
    if (count >= maxProjects) {
      return res.status(403).json({
        error: "❌ الحد الأقصى للمشاريع المحفوظة للخطة الحالية قد تم بلوغه"
      });
    }

    // ✔️ يسمح بإنشاء مشروع
    const project = new SavedProject({
      name,
      data,
      createdBy: req.user.id
    });

    await project.save();
    res.status(201).json({ message: 'تم حفظ المشروع بنجاح ✔️', project });

  } catch (err) {
    console.error('❌ خطأ أثناء الحفظ:', err);
    res.status(500).json({ error: 'فشل حفظ المشروع في قاعدة البيانات' });
  }
});


/*
router.post('/', authMiddleware, async (req, res) => {
  const { name, data } = req.body;

  try {
    const project = new SavedProject({
      name,
      data,
      createdBy: req.user.id
    });

    await project.save();
    res.status(201).json({ message: '✅ تم حفظ المشروع بنجاح', project });
  } catch (err) {
    console.error('❌ خطأ أثناء الحفظ:', err);
    res.status(500).json({ error: 'فشل حفظ المشروع في قاعدة البيانات' });
  }
});
*/

// ✅ جلب كل مشاريع المستخدم
/*
router.get('/mine', authMiddleware, async (req, res) => {
  try {
    const projects = await SavedProject.find({ createdBy: req.user.id }).sort({ updatedAt: -1 });
    res.json(projects);
  } catch (err) {
    console.error('❌ خطأ أثناء الجلب:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب المشاريع' });
  }
});
*/
// ✅ جلب كل مشاريع المستخدم بشكل اسرع من الدي فوقه
router.get('/mine', authMiddleware, async (req, res) => {
  try {
    const projects = await SavedProject.find({ createdBy: req.user.id })
      .sort({ updatedAt: -1 })
      .select('name updatedAt'); // ⚡ فقط الحقول الضرورية
    res.json(projects);
  } catch (err) {
    console.error('❌ خطأ أثناء الجلب:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب المشاريع' });
  }
});





// ✅ حذف مشروع
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const project = await SavedProject.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'المشروع غير موجود' });

    if (!project.createdBy.equals(req.user.id)) {
      return res.status(403).json({ message: 'غير مصرح لك بحذف هذا المشروع' });
    }

    await project.deleteOne();
    res.json({ message: '✅ تم حذف المشروع بنجاح' });
  } catch (err) {
    console.error('❌ خطأ أثناء الحذف:', err);
    res.status(500).json({ message: 'حدث خطأ في السيرفر' });
  }
});




// جلب مشروع بواسطة ID (رابط فريد)
// routes/savedProjects.js

// عرض المشروع للجميع بدون تسجيل دخول

// عرض المشروع للجميع بدون تسجيل دخول — لكن فقط للخطط المدفوعة
router.get('/public/:id', async (req, res) => {
  try {
    const project = await SavedProject.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'المشروع غير موجود' });

    // ❌ اجلب المستخدم صاحب المشروع
    const User = require('../models/User');
    const owner = await User.findById(project.createdBy);

    if (!owner) {
      return res.status(404).json({ message: "صاحب المشروع غير موجود" });
    }

    // ❌ منع الخطة الأساسية من مشاركة الروابط
    if (owner.subscriptionPlan === "basic") {
      return res.status(403).json({
        message: "❌ مشاركة الروابط غير متاحة في الخطة المجانية"
      });
    }

    // ✔️ إذا الخطة Pro أو Premium
    res.json(project);

  } catch (err) {
    console.error('❌ خطأ أثناء تحميل المشروع:', err);
    res.status(500).json({ message: 'حدث خطأ في السيرفر' });
  }
});

/*
router.get('/public/:id', async (req, res) => {
  try {
    const project = await SavedProject.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'المشروع غير موجود' });

    res.json(project);
  } catch (err) {
    console.error('❌ خطأ أثناء تحميل المشروع:', err);
    res.status(500).json({ message: 'حدث خطأ في السيرفر' });
  }
});
*/

// ✅ تحميل مشروع محدد
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const project = await SavedProject.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ error: 'المشروع غير موجود' });
    }

    if (!project.createdBy.equals(req.user.id)) {
      return res.status(403).json({ error: 'غير مصرح لك بالوصول إلى هذا المشروع' });
    }

    res.json(project);
  } catch (err) {
    console.error('❌ خطأ أثناء التحميل:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء تحميل المشروع' });
  }
});




module.exports = router;
