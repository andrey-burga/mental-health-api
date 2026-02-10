"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
// src/config/prisma.ts
require("dotenv/config");
const client_1 = require("@prisma/client");
exports.prisma = new client_1.PrismaClient();
