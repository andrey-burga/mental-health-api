import { Router } from "express";
import { prisma } from "../config/prisma";
const router = Router();

router.get("/", async (_req, res) => {
  const articles = await prisma.article.findMany({
    orderBy: { createdAt: "desc" },
  });

  res.json(articles);
});

export default router;
