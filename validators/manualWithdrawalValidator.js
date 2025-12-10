const Joi = require("joi");


exports.manualWithdrawalValidator = Joi.object({
 

 amount: Joi.number()
    .min(5)
    .required()
    .messages({
      "number.base": "⚠️ المبلغ يجب أن يكون رقمًا",
      "number.min": "⚠️ المبلغ يجب أن يكون أكبر من 0",
      "any.required": "⚠️ المبلغ مطلوب",
    }),

  accountInfo: Joi.string()
    .min(6)
    .max(50)
    .required()
    .messages({
      "string.empty": "⚠️ رقم الحساب البنكي مطلوب",
      "string.min": "⚠️ رقم الحساب قصير جدًا",
      "any.required": "⚠️ رقم الحساب البنكي مطلوب",
    }),

 
});

exports.withdrawalValidator = Joi.object({
 

 amount: Joi.number()
    .min(5)
    .required()
    .messages({
      "number.base": "⚠️ المبلغ يجب أن يكون رقمًا",
      "number.min": "⚠️ المبلغ يجب أن يكون أكبر من 0",
      "any.required": "⚠️ المبلغ مطلوب",
    }),

  accountInfo: Joi.string()
    .min(6)
    .max(50)
    .required()
    .messages({
      "string.empty": "⚠️ رقم الحساب البنكي مطلوب",
      "string.min": "⚠️ رقم الحساب قصير جدًا",
      "any.required": "⚠️ رقم الحساب البنكي مطلوب",
    }),

 
});
