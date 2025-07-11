import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

export interface AuthenticatedRequest extends Request {
  user?: { id: number; email: string; role?: string };
}

export function authenticateJWT(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  // Try to get token from cookie first
  let token = req.cookies.access_token;

  // If not found, try Authorization header (for legacy/test clients)
  if (!token && req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.slice(7);
  }

  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET as string) as any;
    req.user = { id: Number(payload.sub), email: payload.email, role: payload.role };
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}