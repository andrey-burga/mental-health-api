"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../config/prisma");
const router = (0, express_1.Router)();
router.get("/", async (_req, res) => {
    const articles = await prisma_1.prisma.article.findMany({
        orderBy: { createdAt: "desc" },
    });
    res.json(articles);
});
exports.default = router;
