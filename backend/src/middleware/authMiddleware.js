import jwt from 'jsonwebtoken';

/**
 * Verifies JWT and attaches req.user = { id }.
 */
export function protect(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401);
    return next(new Error('Not authorized, missing Bearer token'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id };
    return next();
  } catch (err) {
    res.status(401);
    return next(new Error('Not authorized, invalid token'));
  }
}
