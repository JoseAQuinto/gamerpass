import { useState } from "react";
import { api, setAuthToken } from "../lib/api";
import { useAtom } from "jotai";
import { tokenAtom } from "../state/auth";

// 🔐 añadido: estado global para la DEK y helpers
import { dekAtom } from "../state/dek";
import { genDEK, wrapDEK, unwrapDEK } from "../crypto/dek";

export default function Login() {
  const [, setToken] = useAtom(tokenAtom);
  const [, setDek] = useAtom(dekAtom); // 🔐 guardamos la DEK en memoria

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // 🔐 tras login: obtener DEK envuelta y abrirla (o crearla y subirla)
  async function afterLogin(passwordPlain: string) {
    try {
      const { data } = await api.get<{ dekBlobBase64: string | null }>("/crypto/dek");
      if (data.dekBlobBase64) {
        // Desenvuelve con la contraseña de login
        const dek = await unwrapDEK(data.dekBlobBase64, passwordPlain);
        setDek(dek);
      } else {
        // Primera vez: crea DEK, envuélvela y súbela
        const dek = await genDEK();
        const dekBlobBase64 = await wrapDEK(dek, passwordPlain);
        await api.put("/crypto/dek", { dekBlobBase64 });
        setDek(dek);
      }
    } catch (e) {
      // No bloquea el acceso, pero avisa de que la “caja fuerte” no se abrió.
      console.error("No se pudo inicializar la DEK", e);
      setErr("Sesión iniciada, pero no se pudo inicializar el almacén cifrado. Vuelve a intentarlo.");
    }
  }

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      const url = mode === "login" ? "/auth/login" : "/auth/register";
      const { data } = await api.post(url, { email, password });

      if (mode === "login") {
        // 1) auth API
        setAuthToken(data.token);
        setToken(data.token);

        // 2) 🔐 inicializa la DEK usando la contraseña que el usuario ya escribió
        await afterLogin(password);

        // 3) higiene: borra el campo password del input
        setPassword("");
      } else {
        // tras registro, mantenemos el flujo actual (volver a pestaña login)
        setMode("login");
      }
    } catch (e: any) {
      setErr(e?.response?.data?.error || "Algo ha fallado. Revisa los datos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border bg-white/80 p-6 shadow-sm">
      {/* Tabs */}
      <div className="mb-6 grid grid-cols-2 rounded-xl border bg-slate-50 p-1 text-sm">
        <div>PARGUELON</div>
        <button
          type="button"
          onClick={() => setMode("login")}
          className={[
            "rounded-lg px-3 py-2 transition",
            mode === "login"
              ? "bg-white shadow-sm text-slate-900"
              : "text-slate-500 hover:text-slate-700",
          ].join(" ")}
        >
          Entrar
        </button>
        <button
          type="button"
          onClick={() => setMode("register")}
          className={[
            "rounded-lg px-3 py-2 transition",
            mode === "register"
              ? "bg-white shadow-sm text-slate-900"
              : "text-slate-500 hover:text-slate-700",
          ].join(" ")}
        >
          Registro
        </button>
      </div>

      {/* Info pequeña */}
      <p className="mb-4 text-xs text-slate-500">
        {mode === "login"
          ? "Accede con tu email y contraseña."
          : "Crea una cuenta para guardar tus perfiles de juego."}
      </p>

      {/* Error */}
      {err && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {err}
        </div>
      )}

      {/* Form */}
      <form className="space-y-4" onSubmit={submit}>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Email</span>
          <input
            className="w-full rounded-xl border px-3 py-2 outline-none ring-1 ring-transparent focus:ring-emerald-300"
            placeholder="tucorreo@ejemplo.com"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Contraseña</span>
          <div className="relative">
            <input
              className="w-full rounded-xl border px-3 py-2 pr-20 outline-none ring-1 ring-transparent focus:ring-emerald-300"
              placeholder={mode === "register" ? "Mínimo 6 caracteres" : "Tu contraseña"}
              type={showPwd ? "text" : "password"}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPwd((s) => !s)}
              className="absolute inset-y-0 right-1 my-1 rounded-lg border px-2 text-xs text-slate-600 hover:bg-slate-50"
              aria-label={showPwd ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPwd ? "Ocultar" : "Mostrar"}
            </button>
          </div>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 font-medium text-white transition hover:bg-emerald-700 active:scale-[.98] disabled:opacity-50"
        >
          {loading && (
            <svg
              className="h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" d="M4 12a8 8 0 0 1 8-8" stroke="currentColor" strokeWidth="3" />
            </svg>
          )}
          {loading ? "Procesando…" : mode === "login" ? "Entrar" : "Crear cuenta"}
        </button>
      </form>

      {/* Hint final */}
      <p className="mt-4 text-center text-xs text-slate-500">
        Al continuar aceptas que es un proyecto personal (no se guardan contraseñas reales).
      </p>
    </div>
  );
}
