const mongoose = require("mongoose");

const UserTemplateSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  originalTemplateId: { type: mongoose.Schema.Types.ObjectId, ref: "Template", required: false },
  name: { type: String, default: "Untitled" },
  json: { type: mongoose.Schema.Types.Mixed, required: true }, // نسخة JSON قابلة للتعديل
  assets: { type: [Object], default: [] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("UserTemplate", UserTemplateSchema);
