import express from "express";
import boardRoutes from "./routes/boardRoutes";

const app = express();
app.use(express.json());
app.use("/api", boardRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Board service running on port ${PORT}`);
});