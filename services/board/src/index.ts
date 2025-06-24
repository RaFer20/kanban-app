import express from "express";
import boardRoutes from "./routes/boardRoutes";
import { setupSwagger } from "./swagger";

const app = express();
app.use(express.json());
app.use("/api", boardRoutes);

setupSwagger(app);

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