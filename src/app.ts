import express from "express";
import cors from "cors";
import articlesRoutes from "./routes/articles";
import disordersRoutes from "./routes/disorders";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "mental-health-api" });
});

app.use("/api/articles", articlesRoutes);
app.use("/api/disorders", disordersRoutes);

export default app;
