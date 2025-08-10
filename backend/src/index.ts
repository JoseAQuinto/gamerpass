import express from "express";
import cors from "cors";
import { env } from "./env";
import authRoutes from "./auth/routes";
import accountRoutes from "./accounts/routes";
import gamesRoutes from "./games/routes";
import cryptoRoutes from "./crypto/routes";
// ...



const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cors({ origin: ["http://localhost:5173"], credentials: true }));


app.get("/", (_req, res) => res.json({ ok: true, service: "game-accounts-api" }));
app.use("/auth", authRoutes);
app.use("/accounts", accountRoutes);
app.use("/games", gamesRoutes)

app.use("/crypto", cryptoRoutes);


app.listen(env.PORT, () => console.log(`API on http://localhost:${env.PORT}`));
