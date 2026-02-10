import { Router } from "express";
import {prisma} from "../config/prisma";
const router = Router();

/**
 * GET /api/disorders
 * Lista todos los trastornos
 */
router.get("/", async (_req, res) => {
  const disorders = await prisma.disorder.findMany({
    include: {
      symptoms: true,
    },
    orderBy: {
      title: "asc",
    },
  });

  res.json(disorders);
});

/**
 * GET /api/disorders/:slug
 * Detalle de un trastorno
 */
router.get("/:slug", async (req, res) => {
  const { slug } = req.params;

  const disorder = await prisma.disorder.findUnique({
    where: { slug },
    include: {
      symptoms: true,
    },
  });

  if (!disorder) {
    return res.status(404).json({ message: "Disorder not found" });
  }

  res.json(disorder);
});

export default router;
