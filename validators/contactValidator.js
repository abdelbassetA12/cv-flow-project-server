const Joi = require("joi");

exports.inquiryValidator = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    "string.empty": "⚠️ الاسم مطلوب",
    "string.min": "⚠️ الاسم يجب أن يحتوي على حرفين على الأقل",
    "any.required": "⚠️ الاسم مطلوب",
  }),

  email: Joi.string().email().required().messages({
    "string.email": "⚠️ البريد الإلكتروني غير صالح",
    "any.required": "⚠️ البريد الإلكتروني مطلوب",
  }),

  message: Joi.string().max(500).allow("", null), // اختياري



  
});





exports.feedbackValidator = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    "string.empty": "⚠️ الاسم مطلوب",
    "string.min": "⚠️ الاسم يجب أن يحتوي على حرفين على الأقل",
    "any.required": "⚠️ الاسم مطلوب",
  }),

  email: Joi.string().email().required().messages({
    "string.email": "⚠️ البريد الإلكتروني غير صالح",
    "any.required": "⚠️ البريد الإلكتروني مطلوب",
  }),



  note: Joi.string().max(500).allow("", null), // اختياري

  rating: Joi.number()
    .integer()
    .min(1)
    .max(5)
    .optional()
    .allow(null),


});
