const mongoose = require("mongoose");

const TemplateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, unique: true, index: true },
  description: { type: String, default: "" },
  category: { type: String, index: true, default: "general" },
  tags: { type: [String], default: [] },
  thumbnailUrl: { type: String, default: "" },
  jsonUrl: { type: String, required: true }, // رابط ملف JSON (S3 أو محلي)
  tier: { type: String, enum: ["basic", "pro", "premium"], default: "basic" },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  isPublished: { type: Boolean, default: true },
  createdBy: { type: mongoose.Types.ObjectId, ref: "User", required: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});


module.exports = mongoose.model("Template", TemplateSchema);
