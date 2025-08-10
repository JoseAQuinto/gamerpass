import { Router } from "express";
import { prisma } from "../prisma";
import { auth } from "../auth/middleware";

const r = Router();

// Obtener la DEK envuelta del usuario actual
r.get("/dek", auth, async (req, res) => {
  const userId = (req as any).userId as string;
  const u = await prisma.appUser.findUnique({ where: { id: userId }, select: { dekBlob: true }});
  if (!u?.dekBlob) return res.json({ dekBlobBase64: null });
  const base64 = Buffer.from(u.dekBlob as Uint8Array).toString("base64");
  res.setHeader("Cache-Control", "no-store");
  res.json({ dekBlobBase64: base64 });
});

// Guardar/actualizar la DEK envuelta
r.put("/dek", auth, async (req, res) => {
  const userId = (req as any).userId as string;
  const { dekBlobBase64 } = req.body || {};
  if (!dekBlobBase64 || typeof dekBlobBase64 !== "string") {
    return res.status(400).json({ error: "dekBlobBase64 requerido" });
  }
  await prisma.appUser.update({
    where: { id: userId },
    data: { dekBlob: Buffer.from(dekBlobBase64, "base64") }
  });
  res.status(204).send();
});

export default r;
