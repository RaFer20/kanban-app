import { Response } from "express";

export function requireRole(allowedRoles: string[], userRole: string, res: Response): boolean {
  if (!allowedRoles.includes(userRole)) {
    res.status(403).json({ error: "Forbidden" });
    return false;
  }
  return true;
}