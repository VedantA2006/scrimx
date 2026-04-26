// Not using express-validator package directly, implementing light validation
const validate = (validations) => {
  return async (req, res, next) => {
    const errors = [];

    for (const validation of validations) {
      const { field, rules } = validation;
      const value = req.body[field];

      for (const rule of rules) {
        if (rule === 'required' && (!value || (typeof value === 'string' && !value.trim()))) {
          errors.push(`${field} is required`);
          break;
        }
        if (rule === 'email' && value && !/^\S+@\S+\.\S+$/.test(value)) {
          errors.push(`${field} must be a valid email`);
        }
        if (typeof rule === 'object' && rule.min && value && value.length < rule.min) {
          errors.push(`${field} must be at least ${rule.min} characters`);
        }
        if (typeof rule === 'object' && rule.max && value && value.length > rule.max) {
          errors.push(`${field} cannot exceed ${rule.max} characters`);
        }
        if (typeof rule === 'object' && rule.enum && value && !rule.enum.includes(value)) {
          errors.push(`${field} must be one of: ${rule.enum.join(', ')}`);
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors[0], errors });
    }

    next();
  };
};

module.exports = { validate };
