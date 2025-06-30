import './otel';
import express from "express";
import boardRoutes from "./routes/boardRoutes";
import { setupSwagger } from "./swagger";
import { authenticateJWT } from "./middleware/authMiddleware";
import { setupMetrics, boardsCreated, tasksCreated, httpRequestDuration } from './metrics';
import { logger } from './logger';
import { v4 as uuidv4 } from 'uuid';

declare module 'express-serve-static-core' {
  interface Request {
    id?: string;
  }
}

const app = express();
app.use(express.json());

// Request ID middleware
app.use((req, res, next) => {
  req.id = uuidv4();
  res.setHeader('X-Request-Id', req.id);
  // Attach a child logger with requestId
  req.log = logger.child({ requestId: req.id });
  next();
});

setupSwagger(app); // Register Swagger UI first
setupMetrics(app); // Expose /metrics endpoint

// Optionally, measure request durations
app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer({ method: req.method, route: req.path });
  res.on('finish', () => {
    end({ status_code: res.statusCode });
  });
  next();
});

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
    logger.info(`Board service running on port ${PORT}`);
  });
}

export default app;