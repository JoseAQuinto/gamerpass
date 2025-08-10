// src/crypto/e2e.ts
const ITER = 150_000 as const;
const ALG = "AES-GCM" as const;

function strToBytes(s: string) {
  return new TextEncoder().encode(s);
}
function bytesToStr(b: ArrayBuffer) {
  return new TextDecoder().decode(b);
}
function b64encode(data: ArrayBuffer | Uint8Array) {
  const u8 = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
  let bin = "";
  for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
  return btoa(bin);
}
function b64decode(b64: string): Uint8Array {
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}

async function deriveKey(password: string, salt: Uint8Array, iterations = ITER) {
  const keyMaterial = await crypto.subtle.importKey("raw", strToBytes(password), { name: "PBKDF2" }, false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    keyMaterial,
    { name: ALG, length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptSecret(plaintext: string, masterPassword: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv   = crypto.getRandomValues(new Uint8Array(12));
  const key  = await deriveKey(masterPassword, salt);
  const ct   = await crypto.subtle.encrypt({ name: ALG, iv }, key, strToBytes(plaintext));

  const blob = {
    v: 1,
    alg: ALG,
    kdf: "PBKDF2",
    iter: ITER,
    salt: b64encode(salt),
    iv: b64encode(iv),
    ct: b64encode(ct),
  };
  return b64encode(strToBytes(JSON.stringify(blob)));
}

export async function decryptSecret(secretBlobBase64: string, masterPassword: string): Promise<string> {
  const json = JSON.parse(bytesToStr(b64decode(secretBlobBase64).buffer));
  const salt = b64decode(json.salt);
  const iv   = b64decode(json.iv);
  const key  = await deriveKey(masterPassword, salt, json.iter ?? ITER);
  try {
    const pt = await crypto.subtle.decrypt({ name: ALG, iv }, key, b64decode(json.ct));
    return bytesToStr(pt);
  } catch {
    throw new Error("No se pudo descifrar (master incorrecta o datos corruptos).");
  }
}
