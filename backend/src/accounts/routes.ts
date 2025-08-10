import { Router } from "express";
import { prisma } from "../prisma";
import { auth } from "../auth/middleware";
import { z } from "zod";

const router = Router();

const upsertSchema = z.object({
  gameId: z.number(),
  alias: z.string().min(1),
  username: z.string().min(1),
  region: z.string().optional(),
  status: z.enum(["MAIN","SMURF","BANNED","OTHER"]).optional().default("OTHER"),
  mfaEnabled: z.boolean().optional(),
  recoveryEmail: z.string().email().optional(),
  notes: z.string().optional(),
  secretBlobBase64: z.string().optional()
});

// helper para limpiar la salida
function toSafeAccount(row: any) {
  const { secretBlob, ...rest } = row;
  const hasSecret = !!(secretBlob && (secretBlob as Buffer).length);
  return { ...rest, hasSecret };
}

router.get("/", auth, async (req, res) => {
  const userId = (req as any).userId as string;
  const { gameId, q, status } = req.query;
  const where: any = { userId };
  if (gameId) where.gameId = Number(gameId);
  if (status) where.status = String(status);
  if (q) where.OR = [
    { alias: { contains: String(q), mode: "insensitive" } },
    { username: { contains: String(q), mode: "insensitive" } }
  ];

  const rows = await prisma.gameAccount.findMany({
    where,
    select: {
      id: true,
      userId: true,
      gameId: true,
      alias: true,
      username: true,
      region: true,
      status: true,
      mfaEnabled: true,
      recoveryEmail: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
      game: { select: { id: true, name: true } },
      // lo traemos para poder calcular hasSecret, pero no lo devolvemos
      secretBlob: true
    },
    orderBy: { updatedAt: "desc" }
  });

  res.json(rows.map(toSafeAccount));
});

router.post("/", auth, async (req, res) => {
  const userId = (req as any).userId as string;
  const parse = upsertSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json(parse.error.flatten());
  const d = parse.data;

  const created = await prisma.gameAccount.create({
    data: {
      userId,
      gameId: d.gameId,
      alias: d.alias,
      username: d.username,
      region: d.region,
      status: d.status,
      mfaEnabled: d.mfaEnabled ?? false,
      recoveryEmail: d.recoveryEmail,
      notes: d.notes,
      secretBlob: d.secretBlobBase64 ? Buffer.from(d.secretBlobBase64, "base64") : undefined
    },
    select: {
      id: true, userId: true, gameId: true, alias: true, username: true,
      region: true, status: true, mfaEnabled: true, recoveryEmail: true,
      notes: true, createdAt: true, updatedAt: true,
      game: { select: { id: true, name: true } },
      secretBlob: true
    }
  });

  res.status(201).json(toSafeAccount(created));
});

router.put("/:id", auth, async (req, res) => {
  const userId = (req as any).userId as string;
  const id = req.params.id;
  const parse = upsertSchema.partial().safeParse(req.body);
  if (!parse.success) return res.status(400).json(parse.error.flatten());

  const found = await prisma.gameAccount.findUnique({ where: { id } });
  if (!found || found.userId !== userId) return res.status(404).json({ error: "No existe" });

  const d = parse.data;
  const updated = await prisma.gameAccount.update({
    where: { id },
    data: {
      ...d,
      secretBlob:
        d.secretBlobBase64 !== undefined
          ? (d.secretBlobBase64 ? Buffer.from(d.secretBlobBase64, "base64") : Buffer.from(""))
          : undefined
    },
    select: {
      id: true, userId: true, gameId: true, alias: true, username: true,
      region: true, status: true, mfaEnabled: true, recoveryEmail: true,
      notes: true, createdAt: true, updatedAt: true,
      game: { select: { id: true, name: true } },
      secretBlob: true
    }
  });

  res.json(toSafeAccount(updated));
});

router.delete("/:id", auth, async (req, res) => {
  const userId = (req as any).userId as string;
  const id = req.params.id;
  const found = await prisma.gameAccount.findUnique({ where: { id } });
  if (!found || found.userId !== userId) return res.status(404).json({ error: "No existe" });
  await prisma.gameAccount.delete({ where: { id } });
  res.status(204).send();
});

/**
 * Endpoint para obtener SOLO el secreto cifrado (cuando el cliente lo necesita).
 * Responde { secretBlobBase64 } o 404 si no existe.
 * Añade headers para evitar cache por seguridad.
 */
router.get("/:id/secret", auth, async (req, res) => {
  const userId = (req as any).userId as string;
  const id = req.params.id;

  const row = await prisma.gameAccount.findUnique({
    where: { id },
    select: { userId: true, secretBlob: true }
  });

  if (!row || row.userId !== userId || !row.secretBlob || row.secretBlob.length === 0) {
    return res.status(404).json({ error: "No existe" });
  }

const base64 = Buffer.from(row.secretBlob as Uint8Array).toString("base64");
res.setHeader("Cache-Control", "no-store");
res.json({ secretBlobBase64: base64 });

});


export default router;
