import { useEffect, useState } from "react";
import Modal from "./Modal";

type Props = {
  open: boolean;
  onCancel: () => void;
  onSubmit: (master: string) => void;
};

const SESSION_KEY = "gp_master";

export default function MasterKeyModal({ open, onCancel, onSubmit }: Props) {
  const [val, setVal] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);

  useEffect(() => {
    if (open) {
      const cached = sessionStorage.getItem(SESSION_KEY);
      if (cached) setVal(cached);
    }
  }, [open]);

  function submit() {
    if (!val.trim()) return;
    if (remember) sessionStorage.setItem(SESSION_KEY, val);
    onSubmit(val);
  }

  return (
    <Modal open={open} onClose={onCancel} title="Master password" labelledById="master-title">
      <p className="text-sm text-neutral-400">
        Se usa para cifrar y descifrar tus contraseñas <strong>solo en este dispositivo</strong>.
        No se envía al servidor.
      </p>

      <div>
        <label className="mb-1 block text-xs text-neutral-400">Master password</label>
        <div className="relative">
          <input
            type={show ? "text" : "password"}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            className="w-full rounded-xl border border-neutral-800 bg-neutral-900/60 px-3 py-2 outline-none ring-1 ring-transparent focus:ring-emerald-400/30"
            autoFocus
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-1 top-1/2 -translate-y-1/2 rounded-lg border border-neutral-800 px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-800/70"
          >
            {show ? "Ocultar" : "Mostrar"}
          </button>
        </div>
      </div>

      <label className="mt-2 flex items-center gap-2 text-xs text-neutral-400">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
          className="h-4 w-4 rounded border-neutral-700 bg-neutral-900/60"
        />
        Recordar durante esta sesión
      </label>

      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onCancel} className="rounded-xl border border-neutral-800 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800/70">
          Cancelar
        </button>
        <button onClick={submit} className="rounded-xl bg-neutral-200 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-white">
          Continuar
        </button>
      </div>
    </Modal>
  );
}
