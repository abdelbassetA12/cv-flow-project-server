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

// Subscription tiers
const plansRank = { basic: 0, pro: 1, premium: 2 };
function canAccessTier(userPlan, requiredTier) {
  const userRank = plansRank[(userPlan || "basic").toLowerCase()] ?? 0;
  const requiredRank = plansRank[(requiredTier || "basic").toLowerCase()] ?? 0;
  return userRank >= requiredRank;
}

// Ensure temp folder exists
const tempDir = "uploads/temp";
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, tempDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (
      file.mimetype.startsWith("image/") ||
      file.mimetype === "application/json" ||
      ext === ".json"
    ) {
      cb(null, true);
    } else {
      cb(new Error("❌ نوع الملف غير مسموح. يُسمح فقط بـ JPG أو PNG أو JSON"));
    }
  }
});

// -----------------
// Admin: إضافة قالب جديد
// -----------------
router.post(
  "/add",
  authAdminMiddleware,
  upload.fields([
    { name: "jsonFile", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const { name, description, category, tags = "", tier = "basic" } = req.body;
      if (!name) return res.status(400).json({ message: "Name is required" });

      // Tags
      const tagsArr = tags.split(",").map(t => t.trim()).filter(Boolean);

      // JSON
      if (!req.files?.jsonFile?.length) return res.status(400).json({ message: "JSON file is required" });
      const raw = fs.readFileSync(req.files.jsonFile[0].path, "utf-8");
      let schema;
      try {
        schema = JSON.parse(raw);
      } catch (e) {
        fs.unlinkSync(req.files.jsonFile[0].path);
        return res.status(400).json({ message: "Invalid JSON file" });
      }
      fs.unlinkSync(req.files.jsonFile[0].path);

      // Thumbnail
      let thumbnailUrl = "";
      if (req.files?.thumbnail?.length) {
        const uploadRes = await cloudinary.uploader.upload(
          req.files.thumbnail[0].path,
          { folder: "templates" }
        );
        thumbnailUrl = uploadRes.secure_url;
        fs.unlinkSync(req.files.thumbnail[0].path);
      }

      // Slug
      const slug = slugify(name, { lower: true, strict: true }) + "-" + uuidv4().slice(0, 6);

      // Save to DB
      const template = await Template.create({
        name,
        slug,
        description,
        category,
        tags: tagsArr,
        tier,
        thumbnailUrl,
        schema,
        createdBy: req.admin.id
      });

      res.status(201).json({ success: true, template });

    } catch (err) {
      console.error("Add template error:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// -----------------
// Get all templates
// -----------------
router.get("/", async (req, res) => {
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
// Get template by slug
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

// -----------------
// Clone template for user
// -----------------
router.post("/:slug/clone", authMiddleware, async (req, res) => {
  try {
    const template = await Template.findOne({ slug: req.params.slug }).lean();
    if (!template) return res.status(404).json({ message: "Not found" });
    if (!canAccessTier(req.user.subscriptionPlan, template.tier)) {
      return res.status(403).json({ message: `هذا القالب يتطلب خطة ${template.tier} أو أعلى` });
    }

    const userTpl = await UserTemplate.create({
      userId: req.user.id,
      originalTemplateId: template._id,
      name: `${template.name} (Copy)`,
      json: template.schema,
      assets: template.meta?.assets || []
    });

    res.json({ success: true, userTemplateId: userTpl._id, userTemplate: userTpl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// -----------------
// Save user template
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






