import express from "express";
import boardRoutes from "./routes/boardRoutes";
import { setupSwagger } from "./swagger";
import { authenticateJWT } from "./middleware/authMiddleware";

const app = express();
app.use(express.json());

setupSwagger(app); // Register Swagger UI first

// Protect all /api routes except /api/docs
app.use("/api", (req, res, next) => {
  if (req.path.startsWith("/docs")) {
    // Allow access to Swagger UI without auth
    return next();
  }
  return authenticateJWT(req, res, next);
});

// Mount all board routes under /api
app.use("/api", boardRoutes);

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