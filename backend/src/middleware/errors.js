import mongoose from 'mongoose';
import multer from 'multer';
import { ApiError } from '../utils/http.js';

/** Strips keys like "$gt" or "a.b" from user input to prevent NoSQL injection. */
export function sanitize(req, res, next) {
  const clean = (value) => {
    if (Array.isArray(value)) return value.map(clean);
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value)
          .filter(([k]) => !k.startsWith('$') && !k.includes('.'))
          .map(([k, v]) => [k, clean(v)]),
      );
    }
    return value;
  };
  if (req.body) req.body = clean(req.body);
  next();
}

export function notFound(req, res, next) {
  next(new ApiError(404, `Not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let status = err.status || 500;
  let message = err.message || 'Something went wrong';
  let data = err.data;

  if (err instanceof mongoose.Error.ValidationError) {
    status = 400;
    message = Object.values(err.errors)[0]?.message || 'Invalid data';
  } else if (err instanceof mongoose.Error.CastError) {
    status = 404;
    message = 'Not found';
  } else if (err?.code === 11000) {
    status = 409;
    message = `That ${Object.keys(err.keyValue || {})[0] || 'value'} is already in use.`;
  } else if (err instanceof multer.MulterError) {
    status = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'Image must be 2 MB or smaller.' : err.message;
  } else if (err?.type === 'entity.parse.failed') {
    status = 400;
    message = 'Invalid JSON body';
  } else if (err?.type?.startsWith?.('Stripe')) {
    status = 502;
    message = `Payment provider error: ${err.message}`;
  }

  if (status >= 500) {
    console.error(err);
    if (process.env.NODE_ENV === 'production') message = 'Something went wrong. Please try again.';
  }
  res.status(status).json({ message, ...(data || {}) });
}
