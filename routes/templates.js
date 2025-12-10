






const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const slugify = require('slugify');

const authAdminMiddleware = require('../middleware/authAdminMiddleware'); 
const authMiddleware = require('../middleware/authMiddleware');

const Template = require('../models/Template');
const UserTemplate = require('../models/UserTemplate');

const router = express.Router();


const { v2: cloudinary } = require("cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});







const plansRank = { basic: 0, pro: 1, premium: 2 };

function canAccessTier(userPlan, requiredTier) {
  const userRank = plansRank[(userPlan || "basic").toLowerCase()] ?? 0;
  const requiredRank = plansRank[(requiredTier || "basic").toLowerCase()] ?? 0;
  return userRank >= requiredRank;
}










// إعداد multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/temp"),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
/*
const upload = multer({ storage });
*/
const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 }, // الحد الأقصى 3MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|json/;
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype;

    if (allowedTypes.test(ext) && allowedTypes.test(mime)) {
      cb(null, true);
    } else {
      cb(new Error('❌ نوع الملف غير مسموح. يُسمح فقط بـ JPG أو PNG'));
    }
  }
});



// -----------------
// Admin: إضافة قالب جديد رفع كامل محلي
// -----------------
/*
router.post("/add", authAdminMiddleware, upload.fields([
  { name: "jsonFile", maxCount: 1 },
  { name: "thumbnail", maxCount: 1 }
]), async (req, res) => {
  try {
    const { name, description, category, tags = "", tier = "basic", jsonData } = req.body;
    const tagsArr = tags ? tags.split(",").map(t => t.trim()).filter(Boolean) : [];

    const id = uuidv4();
    const targetDir = path.join("uploads", "templates", id);
    fs.mkdirSync(targetDir, { recursive: true });

    let jsonPath;
    if (req.files?.jsonFile?.length > 0) {
      const tmpPath = req.files.jsonFile[0].path;
      jsonPath = path.join(targetDir, "template.json");
      fs.renameSync(tmpPath, jsonPath);
    } else if (jsonData) {
      jsonPath = path.join(targetDir, "template.json");
      const parsed = typeof jsonData === "string" ? JSON.parse(jsonData) : jsonData;
      fs.writeFileSync(jsonPath, JSON.stringify(parsed, null, 2));
    } else {
      return res.status(400).json({ message: "No template JSON provided." });
    }

    let thumbUrl = "";
    if (req.files?.thumbnail?.length > 0) {
      const tmpThumb = req.files.thumbnail[0].path;
      const destThumb = path.join(targetDir, "thumb" + path.extname(req.files.thumbnail[0].originalname));
      fs.renameSync(tmpThumb, destThumb);
      thumbUrl = `/${destThumb.replace(/\\/g, "/")}`;
    }

    const slug = slugify(name, { lower: true, strict: true }) + "-" + id.slice(0, 6);

    const templateDoc = await Template.create({
      name,
      slug,
      description,
      category,
      tags: tagsArr,
      thumbnailUrl: thumbUrl,
      jsonUrl: `/${jsonPath.replace(/\\/g, "/")}`,
      tier, // يمكنك ترك tier إذا أردت فقط للتصنيف
      createdBy: req.admin.id
    });

    res.status(201).json({ success: true, template: templateDoc });
  } catch (err) {
    console.error("Error adding template:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});
*/
// -----------------
// Admin: إضافة قالب جديد
// -----------------
router.post("/add", authAdminMiddleware, upload.fields([
  { name: "jsonFile", maxCount: 1 },
  { name: "thumbnail", maxCount: 1 }
]), async (req, res) => {
  try {
    const { name, description, category, tags = "", tier = "basic", jsonData } = req.body;
    const tagsArr = tags ? tags.split(",").map(t => t.trim()).filter(Boolean) : [];

    const id = uuidv4();
    const targetDir = path.join("uploads", "templates", id);
    fs.mkdirSync(targetDir, { recursive: true });

    // -----------------------------
    // حفظ JSON كما هو (لا تغيير)
    // -----------------------------
    let jsonPath;
    if (req.files?.jsonFile?.length > 0) {
      const tmpPath = req.files.jsonFile[0].path;
      jsonPath = path.join(targetDir, "template.json");
      fs.renameSync(tmpPath, jsonPath);
    } else if (jsonData) {
      jsonPath = path.join(targetDir, "template.json");
      const parsed = typeof jsonData === "string" ? JSON.parse(jsonData) : jsonData;
      fs.writeFileSync(jsonPath, JSON.stringify(parsed, null, 2));
    } else {
      return res.status(400).json({ message: "No template JSON provided." });
    }

    // -----------------------------
    // رفع Thumbnail إلى Cloudinary
    // -----------------------------
    let thumbUrl = "";

    if (req.files?.thumbnail?.length > 0) {
      const tmpThumb = req.files.thumbnail[0].path;

      const uploadRes = await cloudinary.uploader.upload(tmpThumb, {
        folder: `templates/${id}`,
        resource_type: "image"
      });

      thumbUrl = uploadRes.secure_url;

      // حذف الملف المؤقت
      fs.unlinkSync(tmpThumb);
    }

    const slug = slugify(name, { lower: true, strict: true }) + "-" + id.slice(0, 6);

    const templateDoc = await Template.create({
      name,
      slug,
      description,
      category,
      tags: tagsArr,
      thumbnailUrl: thumbUrl,      // ← الآن URL Cloudinary
      jsonUrl: `/${jsonPath.replace(/\\/g, "/")}`,   // JSON يبقى محلي
      tier,
      createdBy: req.admin.id
    });

    res.status(201).json({ success: true, template: templateDoc });

  } catch (err) {
    console.error("Error adding template:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});


// -----------------
// جلب جميع القوالب
// -----------------
router.get("/",  async (req, res) => {
  try {
    const { category, q, page = 1, limit = 30 } = req.query;
    const filter = { isPublished: true };
    if (category) filter.category = category;
    if (q) filter.name = { $regex: q, $options: "i" };

    const templates = await Template.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    res.json({ success: true, templates });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// -----------------
// جلب قالب حسب slug (بدون تحقق من الخطة)
// -----------------

router.get("/:slug", authMiddleware, async (req, res) => {
  try {
    const t = await Template.findOne({ slug: req.params.slug }).lean();
    if (!t) return res.status(404).json({ message: "Not found" });

    if (!canAccessTier(req.user.subscriptionPlan, t.tier)) {
      return res.status(403).json({ message: `هذا القالب يتطلب خطة ${t.tier} أو أعلى` });
    }

    res.json({ success: true, template: t });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

/*
router.get("/:slug", authMiddleware, async (req, res) => {
  try {
    const t = await Template.findOne({ slug: req.params.slug }).lean();
    if (!t) return res.status(404).json({ message: "Not found" });

    res.json({ success: true, template: t });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});
*/


// -----------------
// نسخ قالب لمستخدم (بدون تحقق من الخطة)
// -----------------


router.post("/:slug/clone", authMiddleware, async (req, res) => {
  try {
    const template = await Template.findOne({ slug: req.params.slug }).lean();
    if (!template) return res.status(404).json({ message: "Not found" });

    if (!canAccessTier(req.user.subscriptionPlan, template.tier)) {
      return res.status(403).json({ message: `هذا القالب يتطلب خطة ${template.tier} أو أعلى` });
    }

    const jsonPath = path.join(process.cwd(), template.jsonUrl);
    if (!fs.existsSync(jsonPath)) {
      return res.status(500).json({ message: "Template JSON not found on server." });
    }
    const jsonContent = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

    const userTpl = await UserTemplate.create({
      userId: req.user.id,
      originalTemplateId: template._id,
      name: `${template.name} (Copy)`,
      json: jsonContent,
      assets: template.meta?.assets || []
    });

    res.json({ success: true, userTemplateId: userTpl._id, userTemplate: userTpl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});




// -----------------
// حفظ قالب المستخدم
// -----------------
router.post("/user/save", authMiddleware, async (req, res) => {
  try {
    const { userTemplateId, json, name } = req.body;
    if (!json) return res.status(400).json({ message: "json required" });

    if (userTemplateId) {
      const doc = await UserTemplate.findById(userTemplateId);
      if (!doc) return res.status(404).json({ message: "user template not found" });
      if (String(doc.userId) !== String(req.user._id)) return res.status(403).json({ message: "forbidden" });

      doc.json = json;
      if (name) doc.name = name;
      doc.updatedAt = new Date();
      await doc.save();
      return res.json({ success: true, userTemplate: doc });
    } else {
      const newDoc = await UserTemplate.create({
        userId: req.user._id,
        name: name || "Untitled",
        json
      });
      return res.json({ success: true, userTemplate: newDoc });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;






