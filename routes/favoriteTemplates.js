const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const Favorite = require("../models/FavoriteTemplate");


// 📌 جلب المفضلات الخاصة بالمستخدم
router.get("/", authMiddleware, async (req, res) => {
  try {
    const favorites = await Favorite.find({ userId: req.user.id }).populate("templateId");
    res.json(favorites);
  } catch (err) {
    console.error("Error fetching favorites:", err);
    res.status(500).json({ message: err.message });
  }
});

// 📌 إضافة قالب إلى المفضلة
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { templateId } = req.body;
    if (!templateId) return res.status(400).json({ message: "templateId required" });

    const exists = await Favorite.findOne({ userId: req.user.id, templateId });
    if (exists) return res.status(400).json({ message: "Already in favorites" });

    const fav = await Favorite.create({ userId: req.user.id, templateId });
    res.status(201).json(fav);
  } catch (err) {
    console.error("Error adding favorite:", err);
    res.status(500).json({ message: err.message });
  }
});

// 📌 حذف من المفضلة
router.delete("/:templateId", authMiddleware, async (req, res) => {
  try {
    await Favorite.findOneAndDelete({
      userId: req.user.id,
      templateId: req.params.templateId,
    });
    res.json({ success: true });
  } catch (err) {
    console.error("Error removing favorite:", err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
