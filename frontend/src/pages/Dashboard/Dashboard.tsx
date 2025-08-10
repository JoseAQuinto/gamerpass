import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import styles from "./Dashboard.module.css";
import { useAtom } from "jotai";
import { dekAtom } from "../../state/dek";
import { encryptWithDEK, decryptWithDEK } from "../../crypto/dek";
import RevealSecretModal from "../../components/RevealSecretModal";

type Game = { id: number; name: string };
type Account = {
  id: string; alias: string; username: string; region?: string;
  status: "MAIN" | "SMURF" | "BANNED" | "OTHER";
  game: Game;
  hasSecret?: boolean;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function statusClass(s: Account["status"]) {
  const base = styles.pill;
  switch (s) {
    case "MAIN": return cx(base, styles["pill--main"]);
    case "SMURF": return cx(base, styles["pill--smurf"]);
    case "BANNED": return cx(base, styles["pill--banned"]);
    default: return cx(base, styles["pill--other"]);
  }
}

export default function Dashboard() {
  const [games, setGames] = useState<Game[]>([]);
  const [rows, setRows] = useState<Account[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [gameId, setGameId] = useState<number | "">("");
  const [form, setForm] = useState({ gameId: 0, alias: "", username: "", region: "", status: "OTHER" as const });
  const [accountPwd, setAccountPwd] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔐 DEK en memoria (derivada tras login)
  const [dek] = useAtom(dekAtom);

  // Modal reveal
  const [openReveal, setOpenReveal] = useState(false);
  const [revealValue, setRevealValue] = useState("");
  // estado para borrar
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function deleteAccount(row: Account) {
    if (!confirm(`¿Eliminar "${row.alias}" (${row.game.name})?`)) return;
    setDeletingId(row.id);
    try {
      await api.delete(`/accounts/${row.id}`);
      // optimista: quitamos la fila sin recargar todo
      setRows(curr => curr.filter(x => x.id !== row.id));
    } catch {
      alert("No se pudo eliminar.");
    } finally {
      setDeletingId(null);
    }
  }


  async function loadGames() {
    const { data } = await api.get<Game[]>("/games");
    setGames(data);
    if (data.length && !form.gameId) setForm(f => ({ ...f, gameId: data[0].id }));
  }
  async function loadAccounts() {
    const { data } = await api.get<Account[]>("/accounts", { params: { q, status, gameId } });
    setRows(data);
  }
  useEffect(() => { loadGames(); loadAccounts(); }, []);

  async function createAccount(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      let secretBlobBase64: string | undefined;

      if (accountPwd) {
        if (!dek) { alert("Sesión cifrada no inicializada. Vuelve a iniciar sesión."); return; }
        secretBlobBase64 = await encryptWithDEK(accountPwd, dek);
      }

      await api.post("/accounts", {
        gameId: form.gameId,
        alias: form.alias,
        username: form.username,
        region: form.region || undefined,
        status: form.status,
        secretBlobBase64,
      });

      setAccountPwd("");
      setForm(f => ({ ...f, alias: "", username: "", region: "" }));
      await loadAccounts();
    } finally {
      setLoading(false);
    }
  }

  async function revealSecret(row: Account) {
    if (!row.hasSecret) { alert("No hay secreto guardado en esta cuenta."); return; }
    if (!dek) { alert("Sesión cifrada no inicializada. Vuelve a iniciar sesión."); return; }

    try {
      const { data } = await api.get<{ secretBlobBase64: string }>(`/accounts/${row.id}/secret`);
      const plain = await decryptWithDEK(data.secretBlobBase64, dek);
      setRevealValue(plain);
      setOpenReveal(true);
    } catch {
      alert("No se pudo descifrar.");
    }
  }

  const stats = useMemo(() => {
    const byGame = new Map<string, number>();
    rows.forEach(r => byGame.set(r.game.name, (byGame.get(r.game.name) || 0) + 1));
    return Array.from(byGame.entries());
  }, [rows]);

  function handleStatsMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    el.style.setProperty("--x", x + "%");
    el.style.setProperty("--y", y + "%");
  }

  return (
    <div className={cx("space-y-10", styles.page)}>
      {/* HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className={cx("text-xl font-semibold tracking-tight", styles.title)}>Tus cuentas</h2>
          <p className="text-sm text-slate-500">Gestiona y filtra tus perfiles de juego.</p>
        </div>
        {/* (ya no hay input de master) */}
      </div>

      {/* FILTROS */}
      <section className={cx(styles.card, styles.cardHover)}>
        <div className="grid gap-3 sm:grid-cols-4">
          <label className="relative">
            <input
              className={cx("w-full px-4 py-2.5 pr-10 placeholder:text-slate-400", styles.field, "focusVisible")}
              placeholder="Buscar alias o usuario…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">⌘K</span>
          </label>

          <select className={cx("w-full px-4 py-2.5", styles.field, "focusVisible")} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Estado: cualquiera</option>
            <option value="MAIN">Principal</option>
            <option value="SMURF">Smurf</option>
            <option value="BANNED">Baneada</option>
            <option value="OTHER">Otro</option>
          </select>

          <select className={cx("w-full px-4 py-2.5", styles.field, "focusVisible")} value={gameId} onChange={(e) => setGameId(e.target.value ? Number(e.target.value) : "")}>
            <option value="">Juego: cualquiera</option>
            {games.map((g) => (<option key={g.id} value={g.id}>{g.name}</option>))}
          </select>

          <button onClick={loadAccounts} className={cx("px-4 py-2.5 text-sm", styles.primaryBtn, "focusVisible")}>
            Aplicar filtros
          </button>
        </div>
      </section>

      {/* STATS */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {stats.map(([name, count]) => (
          <div key={name} onMouseMove={handleStatsMouseMove} className={cx(styles.statsCard)}>
            <div className="text-[11px] uppercase tracking-wide text-slate-500">{name}</div>
            <div className="mt-1 text-3xl font-semibold text-slate-900">{count}</div>
          </div>
        ))}
        {stats.length === 0 && (
          <div className={cx("col-span-full border border-dashed text-center", styles.card)}>
            <div className="text-sm text-slate-600">Aún no hay estadísticas.</div>
            <div className="text-xs text-slate-500">Añade tu primera cuenta abajo.</div>
          </div>
        )}
      </section>

      {/* TABLA */}
      <section className={cx(styles.card, "overflow-hidden")}>
        <div className={styles.tableWrap}>
          <table className="w-full text-sm">
            <thead className={cx(styles.thead)}>
              <tr className="[&>th]:text-left [&>th]:px-4 [&>th]:py-3 [&>th]:text-slate-600">
                <th>Juego</th><th>Alias</th><th>Usuario</th><th>Región</th><th>Estado</th><th className="text-right">Acciones</th> {/* <- NUEVO */}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} className={cx(styles.row, "[&>td]:px-4 [&>td]:py-3")}>
                  <td className="font-medium text-slate-800">{r.game.name}</td>
                  <td className="text-slate-700">{r.alias}</td>
                  <td className="text-slate-700">
                    <span className="inline-flex items-center gap-2">
                      <span className="truncate max-w-[220px]">{r.username}</span>
                      <button
                        type="button"
                        title="Copiar usuario"
                        onClick={() => navigator.clipboard.writeText(r.username)}
                        className={cx("rounded-lg border px-2 py-0.5 text-xs text-slate-600 transition hover:bg-slate-100 active:scale-95", styles.copyBtn, "focusVisible")}
                      >
                        copiar
                      </button>
                      <button
                        type="button"
                        disabled={!r.hasSecret}
                        onClick={() => revealSecret(r)}
                        className={cx(
                          "rounded-lg border px-2 py-0.5 text-xs transition active:scale-95",
                          styles.copyBtn, "focusVisible",
                          !r.hasSecret && "opacity-50 cursor-not-allowed"
                        )}
                        title="Ver/copy contraseña (descifrar)"
                      >
                        copiar pass
                      </button>
                    </span>
                  </td>
                  <td className="text-slate-600">{r.region || "-"}</td>
                  <td><span className={statusClass(r.status)}>{r.status}</span></td>
                    <td className="text-right">
    <button
      type="button"
      onClick={() => deleteAccount(r)}
      disabled={deletingId === r.id}
      className="rounded-lg border border-rose-200 px-2 py-0.5 text-xs text-rose-700 hover:bg-rose-50 active:scale-95 disabled:opacity-50 focusVisible"
      title="Eliminar cuenta"
    >
      {deletingId === r.id ? "Borrando…" : "Eliminar"}
    </button>
  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className={cx("border border-dashed", styles.card)}>
                      <div className="text-sm text-slate-600">No hay cuentas todavía</div>
                      <div className="text-xs text-slate-500">Crea la primera justo abajo 👇</div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* FORMULARIO CREAR */}
      <section className={cx(styles.card, styles.cardHover)}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Añadir cuenta</h3>
            <p className="text-xs text-slate-500">Solo datos no sensibles. Puedes añadir notas después.</p>
          </div>
          {loading && <span className={cx("text-xs text-slate-500", styles.dotPulse)}><i></i><i></i><i></i></span>}
        </div>

        <form className="grid gap-3 md:grid-cols-2" onSubmit={createAccount}>
          <select className={cx("w-full px-4 py-2.5", styles.field, "focusVisible")} value={form.gameId} onChange={(e) => setForm({ ...form, gameId: Number(e.target.value) })}>
            {games.map((g) => (<option key={g.id} value={g.id}>{g.name}</option>))}
          </select>
          <input className={cx("w-full px-4 py-2.5", styles.field, "focusVisible")} placeholder="Alias" value={form.alias} onChange={(e) => setForm({ ...form, alias: e.target.value })} required />
          <input className={cx("w-full px-4 py-2.5", styles.field, "focusVisible")} placeholder="Usuario/ID" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
          <input className={cx("w-full px-4 py-2.5", styles.field, "focusVisible")} placeholder="Contraseña de la cuenta (opcional)" type="password" value={accountPwd} onChange={(e) => setAccountPwd(e.target.value)} />
          <input className={cx("w-full px-4 py-2.5", styles.field, "focusVisible")} placeholder="Región (opcional)" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
          <select className={cx("w-full px-4 py-2.5", styles.field, "focusVisible")} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })}>
            <option value="MAIN">Principal</option>
            <option value="SMURF">Smurf</option>
            <option value="BANNED">Baneada</option>
            <option value="OTHER">Otro</option>
          </select>
          <div className="flex items-center gap-2">
            <button className={cx("px-5 py-2.5", styles.primaryBtn, "disabled:opacity-60 focusVisible")} disabled={loading}>
              {loading ? "Guardando..." : "Guardar"}
            </button>
            <button type="button" onClick={() => setForm({ ...form, alias: "", username: "", region: "", status: "OTHER" })} className={cx("px-5 py-2.5 text-slate-700", styles.secondaryBtn, "focusVisible")}>
              Limpiar
            </button>
          </div>
        </form>
      </section>

      {/* Modal de revelar */}
      <RevealSecretModal open={openReveal} onClose={() => setOpenReveal(false)} value={revealValue} />
    </div>
  );
}
