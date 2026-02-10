"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../config/prisma");
const router = (0, express_1.Router)();
/**
 * GET /api/disorders
 * Lista todos los trastornos
 */
router.get("/", async (_req, res) => {
    const disorders = await prisma_1.prisma.disorder.findMany({
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
    const disorder = await prisma_1.prisma.disorder.findUnique({
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
exports.default = router;
