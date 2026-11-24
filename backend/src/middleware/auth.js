import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/index.js';
import { ApiError } from '../utils/http.js';

export const signToken = (user) =>
  jwt.sign({ sub: user.id, role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

async function userFromRequest(req) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return { user: null, reason: 'missing' };
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(payload.sub);
    if (!user) return { user: null, reason: 'invalid' };
    if (!user.active) return { user: null, reason: 'inactive' };
    return { user };
  } catch {
    return { user: null, reason: 'invalid' };
  }
}

/** Requires a valid JWT. Sets req.user. */
export async function protect(req, res, next) {
  const { user, reason } = await userFromRequest(req);
  if (!user) {
    const msg = reason === 'inactive' ? 'This account has been deactivated.' : 'Please sign in to continue.';
    return next(new ApiError(401, msg));
  }
  req.user = user;
  return next();
}

/** Uses the JWT if present (e.g. checkout works for guests and signed-in customers). */
export async function optionalAuth(req, res, next) {
  const { user } = await userFromRequest(req);
  if (user) req.user = user;
  next();
}

/** Role-based access control: authorize('admin', 'foh') */
export const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new ApiError(403, 'You do not have permission to do this.'));
  }
  return next();
};

export const isStaff = (user) => Boolean(user && ['admin', 'kitchen', 'foh'].includes(user.role));
