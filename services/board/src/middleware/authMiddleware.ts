import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}
console.log("JWT_SECRET:", JWT_SECRET);

export interface AuthenticatedRequest extends Request {
  user?: { id: number; email: string; role?: string };
}

export function authenticateJWT(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  console.log("Authorization header:", req.headers.authorization);
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }
  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET as string) as any;
    req.user = { id: Number(payload.sub), email: payload.email, role: payload.role };
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}