import { useState } from "react";
import Modal from "./Modal";

type Props = {
  open: boolean;
  onClose: () => void;
  value: string; // contraseña en claro
  label?: string;
};

export default function RevealSecretModal({ open, onClose, value, label = "Contraseña" }: Props) {
  const [show, setShow] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
  }

  return (
    <Modal open={open} onClose={onClose} title="Secreto">
      <div>
        <label className="mb-1 block text-xs text-neutral-400">{label}</label>
        <div className="relative">
          <input
            type={show ? "text" : "password"}
            value={value}
            readOnly
            className="w-full rounded-xl border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-neutral-200"
          />
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-2">
            <button
              onClick={() => setShow((s) => !s)}
              className="rounded-lg border border-neutral-800 px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-800/70"
            >
              {show ? "Ocultar" : "Mostrar"}
            </button>
            <button
              onClick={copy}
              className="rounded-lg border border-neutral-800 px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-800/70"
            >
              Copiar
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button onClick={onClose} className="rounded-xl bg-neutral-200 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-white">
          Cerrar
        </button>
      </div>
    </Modal>
  );
}
