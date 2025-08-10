import { Router } from "express";
import { prisma } from "../prisma";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { env } from "../env";
import { z } from "zod";

const router = Router();
const authSchema = z.object({ email: z.string().email(), password: z.string().min(6) });

router.post("/register", async (req, res) => {
  const parse = authSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json(parse.error.flatten());
  const { email, password } = parse.data;
  const exists = await prisma.appUser.findUnique({ where: { email } });
  if (exists) return res.status(409).json({ error: "Email ya registrado" });
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.appUser.create({ data: { email, passwordHash } });
  res.status(201).json({ id: user.id, email: user.email });
});

router.post("/login", async (req, res) => {
  const parse = authSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json(parse.error.flatten());
  const { email, password } = parse.data;
  const user = await prisma.appUser.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: "Credenciales" });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Credenciales" });
  const token = jwt.sign({ sub: user.id }, env.JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, user: { id: user.id, email: user.email } });
});

export default router;
