/**
 * Joi DTO Validation Middleware
 * Validates request body against a Joi schema
 */

/**
 * Create a validation middleware for a given Joi schema
 * @param {Object} schema - Joi schema to validate against
 * @param {String} source - Request property to validate ('body', 'query', 'params')
 * @returns {Function} Express middleware function
 */
const validateDto = (schema, source = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false, // Collect all errors, not just the first one
      stripUnknown: true, // Remove unknown keys from the validated data
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return res.status(422).json({
        status: 'error',
        message: 'Validation failed',
        errors,
      });
    }

    // Replace request data with validated and sanitized data
    req[source] = value;
    next();
  };
};

module.exports = validateDto;
