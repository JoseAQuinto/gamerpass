import { useAtom } from "jotai";
import { tokenAtom } from "./state/auth";
import { setAuthToken } from "./lib/api";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard/Dashboard";

export default function App() {
  const [token, setToken] = useAtom(tokenAtom);
  const logged = Boolean(token);

  function logout() {
    setAuthToken(undefined);
    setToken(null);
  }

  return (
    // Fondo base suave y consistente (sin parches grises)
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-100">
      {/* NAV */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-600 text-sm font-semibold text-white shadow-sm">
              GP
            </div>
            <div className="flex items-baseline gap-2">
              <h1 className="text-lg font-semibold tracking-tight text-slate-900">GamerPass</h1>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700">
                alpha
              </span>
            </div>
          </div>

          {/* Right: status + action */}
          <div className="flex items-center gap-2">
            <span
              className={[
                "hidden sm:inline-block rounded-full border px-2.5 py-1 text-xs",
                logged
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-slate-50 text-slate-700",
              ].join(" ")}
            >
              {logged ? "Sesión iniciada" : "Invitado"}
            </span>

            {logged ? (
              <button
                onClick={logout}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50 active:scale-[.98]"
                title="Cerrar sesión"
              >
                Salir
              </button>
            ) : null}
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <main className="mx-auto max-w-5xl px-4 py-6">
        {/* Superficie SOLIDA (sin /80) y misma paleta que header */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          {logged ? <Dashboard /> : <Login />}
        </div>
      </main>

      {/* FOOTER */}
      <footer className="mx-auto max-w-5xl px-4 pb-8 text-center text-xs text-slate-500">
        Hecho con React · Tailwind · Express · Prisma
      </footer>
    </div>
  );
}
