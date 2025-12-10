const Joi = require("joi");

exports.registerValidator = Joi.object({
  username: Joi.string().min(3).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(50).required(),
  referralCode: Joi.string().optional().allow("", null)
});

exports.loginValidator = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(50).required()
});


exports.changePasswordValidator = Joi.object({
  oldPassword: Joi.string().min(6).max(50).required(),
  newPassword: Joi.string().min(6).max(50).required()
});


exports.resetPasswordValidator = Joi.object({
  token: Joi.string().required(),
  newPassword: Joi.string().min(6).max(50).required()
});


exports.forgotEmailValidator = Joi.object({
  email: Joi.string().email().required(),
});
