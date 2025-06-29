import express from "express";
import boardRoutes from "./routes/boardRoutes";
import { setupSwagger } from "./swagger";
import { authenticateJWT } from "./middleware/authMiddleware";

const app = express();
app.use(express.json());

setupSwagger(app); // Register Swagger UI first

// Only protect actual API routes, not /api/docs
app.use("/api", (req, res, next) => {
  if (req.path.startsWith("/docs")) {
    return next(); // Allow access to Swagger UI without auth
  }
  authenticateJWT(req, res, next);
}, boardRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Board service running on port ${PORT}`);
  });
}

export default app;