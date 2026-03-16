import { Storage } from "./storage.js";

export function ensureSession() {
  const s = Storage.getSession();
  if (!s) throw new Error("Session belum ada. Mulai dari index.html.");
  return s;
}

export function updateSession(patch) {
  const s = Storage.getSession() || {};
  const next = { ...s, ...patch };
  Storage.setSession(next);
  return next;
}