// Deriva KEK de la contraseña y envuelve/abre DEK (Web Crypto)

const ITER = 150_000 as const;

function s2b(s: string) { return new TextEncoder().encode(s); }
function b2s(b: ArrayBuffer) { return new TextDecoder().decode(b); }
function b64e(buf: ArrayBuffer | Uint8Array) {
  const u8 = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf;
  let bin = ""; for (let i=0;i<u8.length;i++) bin += String.fromCharCode(u8[i]);
  return btoa(bin);
}
function b64d(b64: string) {
  const bin = atob(b64); const u8 = new Uint8Array(bin.length);
  for (let i=0;i<bin.length;i++) u8[i] = bin.charCodeAt(i);
  return u8;
}

async function deriveKEK(password: string, salt: Uint8Array, iterations = ITER) {
  const mat = await crypto.subtle.importKey("raw", s2b(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    mat, { name: "AES-GCM", length: 256 }, false, ["encrypt","decrypt"]
  );
}

// DEK = CryptoKey AES-GCM 256
export async function genDEK() {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt","decrypt"]);
}
export async function exportDEKraw(dek: CryptoKey) {
  return crypto.subtle.exportKey("raw", dek); // ArrayBuffer 32 bytes
}
export async function importDEKraw(raw: ArrayBuffer) {
  return crypto.subtle.importKey("raw", raw, { name:"AES-GCM", length:256 }, true, ["encrypt","decrypt"]);
}

// Envolver DEK con contraseña (produce blob base64)
export async function wrapDEK(dek: CryptoKey, password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv   = crypto.getRandomValues(new Uint8Array(12));
  const kek  = await deriveKEK(password, salt);
  const raw  = await exportDEKraw(dek);
  const ct   = await crypto.subtle.encrypt({ name:"AES-GCM", iv }, kek, raw);
  const blob = { v:1, alg:"AES-GCM", kdf:"PBKDF2", iter:ITER, salt:b64e(salt), iv:b64e(iv), ct:b64e(ct) };
  return b64e(s2b(JSON.stringify(blob)));
}

// Abrir DEK con contraseña (devuelve CryptoKey)
export async function unwrapDEK(dekBlobBase64: string, password: string) {
  const json = JSON.parse(b2s(b64d(dekBlobBase64).buffer));
  const salt = b64d(json.salt), iv = b64d(json.iv);
  const kek  = await deriveKEK(password, salt, json.iter ?? ITER);
  const raw  = await crypto.subtle.decrypt({ name:"AES-GCM", iv }, kek, b64d(json.ct));
  return importDEKraw(raw);
}

// Cifrar/descifrar secretos con la DEK
export async function encryptWithDEK(plaintext: string, dek: CryptoKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name:"AES-GCM", iv }, dek, s2b(plaintext));
  return b64e(s2b(JSON.stringify({ v:1, alg:"AES-GCM", iv:b64e(iv), ct:b64e(ct) })));
}
export async function decryptWithDEK(secretBlobBase64: string, dek: CryptoKey) {
  const json = JSON.parse(b2s(b64d(secretBlobBase64).buffer));
  const iv = b64d(json.iv);
  const pt = await crypto.subtle.decrypt({ name:"AES-GCM", iv }, dek, b64d(json.ct));
  return b2s(pt);
}
