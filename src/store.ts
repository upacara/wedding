import { useEffect, useState } from "react";
import { WEDDING as DEFAULT_WEDDING, GALLERY as DEFAULT_GALLERY, STORY as DEFAULT_STORY } from "./data";

export type Gift = { bank: string; number: string; name: string };
export type StoryItem = { year: string; title: string; text: string };
export type WeddingConfig = typeof DEFAULT_WEDDING & { gifts: Gift[] } & {
  gallery: string[];
  story: StoryItem[];
  musicUrl: string;
  heroPhoto: string;
  groomPhoto: string;
  bridePhoto: string;
};

export type Wish = { no?: number; name: string; msg: string; attend: string; guests?: string; at: number };
export type Guest = { no: number; name: string };

const KEY = "wedding-cms-config-v1";
const WISH_KEY = "wedding-wishes";
const AUTH_KEY = "wedding-cms-auth";
export const DEFAULT_PASSWORD = "admin123";

// Backend: Google Apps Script → Sheets (gratis). Kosong = mode lokal saja.
const API = import.meta.env.VITE_SHEETS_API_URL || "";
const TOKEN = import.meta.env.VITE_SHEETS_TOKEN || "";
export const isSheetsConfigured = Boolean(API);

const SEED_WISHES: Wish[] = [
  { name: "Keluarga Budi", msg: "Barakallahu laka wa baraka alaika wa jamaa bainakuma fii khair. Selamat!", attend: "Hadir", at: 1 },
  { name: "Sinta & Andi", msg: "Happy wedding! Semoga menjadi keluarga sakinah mawaddah warahmah.", attend: "Hadir", at: 2 },
];

export const defaults = (): WeddingConfig => ({
  ...DEFAULT_WEDDING,
  gifts: [...DEFAULT_WEDDING.gifts],
  gallery: [...DEFAULT_GALLERY],
  story: [...DEFAULT_STORY],
  musicUrl: "https://res.cloudinary.com/pslavszr/video/upload/v1790743147/wedding/rdfqee45l5i8yxlya0si.mp3",
  heroPhoto: "https://drive.google.com/thumbnail?id=1_1u2ctDUN4jMepfgO7YH-LyzQS-dNmmi&sz=w1000",
  groomPhoto: "https://lh3.googleusercontent.com/d/1lLPCIlflzPyQW-bhiflelnBAPvuWPqXT",
  bridePhoto: "https://lh3.googleusercontent.com/d/1yMnlEdW30D8z_M8HzmSi0ul7-RZX3nC_",
});

export function loadLocal(): WeddingConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    return { ...defaults(), ...JSON.parse(raw) };
  } catch {
    return defaults();
  }
}

function post(body: Record<string, unknown>) {
  return fetch(API, {
    method: "POST",
    headers: { "Content-Type": "text/plain" }, // hindari preflight CORS
    body: JSON.stringify(body),
  }).then((r) => r.json());
}

/** Simpan lokal + ke Google Sheets (jika dikonfigurasi). Tamu membaca dari Sheets. */
export async function saveConfig(cfg: WeddingConfig) {
  localStorage.setItem(KEY, JSON.stringify(cfg));
  window.dispatchEvent(new CustomEvent("wedding-config-updated"));
  if (isSheetsConfigured) {
    try {
      const res = await post({ action: "saveConfig", token: TOKEN, config: cfg });
      if (!res.ok) alert("Tersimpan lokal, tapi gagal ke Sheets: " + (res.error || "error"));
    } catch (e) {
      console.warn(e);
      alert("Tersimpan lokal, tapi gagal ke Sheets. Cek URL deploy / akses Anyone.");
    }
  }
}

export async function resetConfig() {
  const d = defaults();
  localStorage.setItem(KEY, JSON.stringify(d));
  window.dispatchEvent(new CustomEvent("wedding-config-updated"));
  if (isSheetsConfigured) {
    try { await post({ action: "saveConfig", token: TOKEN, config: d }); } catch { /* ignore */ }
  }
}

/** Config live: Sheets → fallback localStorage. */
export function useCmsConfig(): WeddingConfig {
  const [cfg, setCfg] = useState<WeddingConfig>(loadLocal);
  useEffect(() => {
    const reload = () => setCfg(loadLocal());
    window.addEventListener("wedding-config-updated", reload);
    window.addEventListener("storage", reload);
    let stop = false;
    const timer = setInterval(async () => {
      if (!isSheetsConfigured || stop) return;
      try {
        const r = await fetch(`${API}?action=getConfig`).then((x) => x.json());
        if (r.config) {
          const merged = { ...defaults(), ...r.config };
          setCfg(merged);
          localStorage.setItem(KEY, JSON.stringify(merged));
        }
      } catch { /* offline — pakai lokal */ }
    }, 30000);
    // ambil sekali saat load
    (async () => {
      if (!isSheetsConfigured) return;
      try {
        const r = await fetch(`${API}?action=getConfig`).then((x) => x.json());
        if (r.config && !stop) {
          const merged = { ...defaults(), ...r.config };
          setCfg(merged);
          localStorage.setItem(KEY, JSON.stringify(merged));
        }
      } catch { /* ignore */ }
    })();
    return () => {
      stop = true;
      clearInterval(timer);
      window.removeEventListener("wedding-config-updated", reload);
      window.removeEventListener("storage", reload);
    };
  }, []);
  return cfg;
}

// ---------- Wishes / RSVP ----------

function loadLocalWishes(): Wish[] {
  try { return JSON.parse(localStorage.getItem(WISH_KEY) || "[]"); }
  catch { return []; }
}

export function useWishes() {
  const [wishes, setWishes] = useState<Wish[]>(loadLocalWishes);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let stop = false;
    const pull = async () => {
      if (!isSheetsConfigured || stop) return;
      try {
        const r = await fetch(`${API}?action=getWishes`).then((x) => x.json());
        if (Array.isArray(r.wishes) && !stop) setWishes(r.wishes);
      } catch { /* ignore */ }
    };
    pull();
    const timer = setInterval(pull, 15000);
    const local = () => setWishes(loadLocalWishes());
    window.addEventListener("wedding-wishes-updated", local);
    return () => {
      stop = true;
      clearInterval(timer);
      window.removeEventListener("wedding-wishes-updated", local);
    };
  }, []);

  const send = async (w: Omit<Wish, "at">) => {
    setSending(true);
    try {
      if (isSheetsConfigured) {
        const res = await post({ action: "addWish", wish: { ...w, at: Date.now() } });
        if (!res.ok) throw new Error(res.error || "gagal");
      } else {
        const next = [{ ...w, at: Date.now() }, ...loadLocalWishes()].slice(0, 100);
        localStorage.setItem(WISH_KEY, JSON.stringify(next));
        window.dispatchEvent(new CustomEvent("wedding-wishes-updated"));
      }
      return true;
    } catch (e) {
      console.warn(e);
      alert("Gagal mengirim. Cek koneksi / URL Sheets.");
      return false;
    } finally {
      setSending(false);
    }
  };

  return { wishes: wishes.length ? wishes : SEED_WISHES, sending, send };
}

// ---------- Guest list ----------

/** Link undangan personal: cover otomatis menampilkan nama tamu. */
export function guestLink(name: string) {
  return `${window.location.origin}${window.location.pathname}?to=${encodeURIComponent(name)}`;
}

export function useGuests() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let stop = false;
    const pull = async () => {
      if (!isSheetsConfigured || stop) return;
      try {
        const r = await fetch(`${API}?action=getGuests`).then((x) => x.json());
        if (Array.isArray(r.guests) && !stop) setGuests(r.guests);
      } catch { /* ignore */ }
    };
    pull();
    const timer = setInterval(pull, 15000);
    return () => { stop = true; clearInterval(timer); };
  }, []);

  const add = async (name: string) => {
    const n = name.trim().slice(0, 100);
    if (!n) return false;
    setBusy(true);
    try {
      const res = await post({ action: "addGuest", token: TOKEN, guest: { name: n } });
      if (!res.ok) throw new Error(res.error || "gagal");
      setGuests((g) => [...g, { no: res.no ?? Date.now(), name: n }]);
      return true;
    } catch (e) {
      alert(e instanceof Error ? e.message : "Gagal menambah tamu.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const remove = async (no: number) => {
    setBusy(true);
    try {
      const res = await post({ action: "deleteGuest", token: TOKEN, no });
      if (!res.ok) throw new Error(res.error || "gagal");
      setGuests((g) => g.filter((x) => x.no !== no));
      return true;
    } catch (e) {
      alert(e instanceof Error ? e.message : "Gagal menghapus tamu.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  return { guests, busy, add, remove };
}

// --- password gate admin (client-side) ---
export function isAuthed() {
  return sessionStorage.getItem(AUTH_KEY) === "1";
}
export function login(password: string): boolean {
  const saved = localStorage.getItem("wedding-cms-password") || DEFAULT_PASSWORD;
  if (password === saved) {
    sessionStorage.setItem(AUTH_KEY, "1");
    return true;
  }
  return false;
}
export function logout() {
  sessionStorage.removeItem(AUTH_KEY);
}
export function changePassword(next: string) {
  localStorage.setItem("wedding-cms-password", next);
}
