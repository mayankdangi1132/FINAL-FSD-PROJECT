// HTTP helpers: error type, async wrapper and zod validation middleware.

export class ApiError extends Error {
  constructor(status, message, data = undefined) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

/** Lets async route handlers throw instead of calling next(err). */
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** Validates req[source] with a zod schema and replaces it with the parsed (cleaned) value. */
export const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const errors = result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    return next(new ApiError(400, errors[0]?.message || 'Invalid request', { errors }));
  }
  if (source === 'query') req.validQuery = result.data;
  else req[source] = result.data;
  return next();
};
