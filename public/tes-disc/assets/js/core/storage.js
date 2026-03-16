import { CONFIG } from "./config.js";
export const Storage = {
  getSession() {
    const raw = localStorage.getItem(CONFIG.storageKey);
    return raw ? JSON.parse(raw) : null;
  },
  setSession(session) {
    localStorage.setItem(CONFIG.storageKey, JSON.stringify(session));
  },
  clearSession() {
    localStorage.removeItem(CONFIG.storageKey);
  },
  saveResult(testId, payload) {
    localStorage.setItem(CONFIG.resultKeyPrefix + testId, JSON.stringify(payload));
  },
  clearResult(testId) {
    localStorage.removeItem(CONFIG.resultKeyPrefix + testId);
  },
  getResult(testId) {
    const raw = localStorage.getItem(CONFIG.resultKeyPrefix + testId);
    return raw ? JSON.parse(raw) : null;
  }
};
