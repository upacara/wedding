import { useState } from "react";
import {
  DEFAULT_PASSWORD, changePassword, guestLink, isAuthed, isSheetsConfigured, loadLocal, login, logout, resetConfig, saveConfig, useGuests,
} from "./store";
import type { WeddingConfig } from "./store";
import { canUpload } from "./uploads";
import { uploadAudio, uploadPhoto } from "./uploads";

const input = "w-full border border-sage-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sage-400";
const label = "text-xs font-semibold tracking-wide text-sage-600 uppercase";
const btn = "rounded-xl px-4 py-2.5 text-sm font-medium transition";
const tabCls = (active: boolean) =>
  `px-4 py-2 rounded-full text-sm whitespace-nowrap transition ${active ? "bg-sage-800 text-cream" : "bg-sage-100 text-sage-700 hover:bg-sage-200"}`;

const TABS = ["Mempelai", "Acara", "Galeri", "Story", "Tamu", "Gift & Musik", "Backup"] as const;

// Convert Google Drive share links to direct image URLs.
// e.g. .../file/d/FILE_ID/view → https://drive.google.com/thumbnail?id=FILE_ID&sz=w1000
export function convertDriveUrl(url: string): string {
  const m = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w1000`;
  return url;
}

// Audio needs a download/stream URL, not the image thumbnail URL.
export function convertDriveAudio(url: string): string {
  const m = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return `https://drive.google.com/uc?export=download&id=${m[1]}`;
  return url;
}

export default function Admin() {
  const [authed, setAuthed] = useState(isAuthed());
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [cfg, setCfg] = useState<WeddingConfig>(() => loadLocal());
  const [tab, setTab] = useState<(typeof TABS)[number]>("Mempelai");
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [newPw, setNewPw] = useState("");
  const [importText, setImportText] = useState("");
  const [guestName, setGuestName] = useState("");
  const { guests, busy: guestsBusy, add: addGuest, remove: removeGuest } = useGuests();

  if (!authed) {
    return (
      <div className="min-h-screen bg-sage-900 flex items-center justify-center px-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (login(pw)) setAuthed(true);
            else setErr("Password salah. Default: admin123");
          }}
          className="bg-cream rounded-3xl p-8 w-full max-w-sm shadow-2xl"
        >
          <p className="tracking-[0.3em] text-xs text-sage-500 uppercase text-center">Wedding CMS</p>
          <h1 className="font-script text-4xl text-center text-sage-800 mt-2">Admin Panel</h1>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Password"
            className={`${input} mt-6`} autoFocus />
          {err && <p className="text-red-600 text-sm mt-2">{err}</p>}
          <button className="w-full bg-sage-700 text-cream rounded-xl py-3 mt-4 hover:bg-sage-800">Masuk</button>
          <a href="#/" className="block text-center text-sm text-sage-500 mt-4 hover:underline">← Kembali ke undangan</a>
        </form>
      </div>
    );
  }

  const set = <K extends keyof WeddingConfig>(k: K, v: WeddingConfig[K]) =>
    setCfg((c) => ({ ...c, [k]: v }));

  const save = async () => {
    setSaved(true);
    await saveConfig(cfg);
    setTimeout(() => setSaved(false), 2000);
  };

  /** Upload file ke Cloudinary, lalu tulis URL-nya via `apply`. */
  const handleUpload = async (slot: string, file: File, kind: "photo" | "audio", apply: (url: string) => void) => {
    if (!canUpload) { alert("Isi Cloudinary di .env dulu untuk upload (gratis, tanpa kartu)."); return; }
    setUploading(slot);
    try {
      const url = kind === "photo" ? await uploadPhoto(file) : await uploadAudio(file);
      apply(url);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Upload gagal.");
    } finally {
      setUploading(null);
    }
  };

  const pickFile = (accept: string, onFile: (f: File) => void) => {
    const inp = document.createElement("input");
    inp.type = "file"; inp.accept = accept;
    inp.onchange = () => { const f = inp.files?.[0]; if (f) onFile(f); };
    inp.click();
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(cfg, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "wedding-config.json";
    a.click();
  };

  const doImport = () => {
    try {
      const parsed = JSON.parse(importText);
      setCfg((c) => ({ ...c, ...parsed }));
      setImportText("");
      alert("Import berhasil — klik Simpan untuk menerapkan.");
    } catch {
      alert("JSON tidak valid.");
    }
  };

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-sage-800 text-cream sticky top-0 z-10 shadow">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] tracking-[0.3em] uppercase text-cream/60">Wedding CMS</p>
            <h1 className="font-serif2 text-xl font-semibold">Edit Undangan Pernikahan</h1>
          </div>
          <div className="flex gap-2">
            <a href="#/" className={`${btn} bg-white/10 hover:bg-white/20 text-sm`}>👁 Preview</a>
            <button onClick={() => { logout(); setAuthed(false); }} className={`${btn} bg-white/10 hover:bg-white/20 text-sm`}>Keluar</button>
            <button onClick={save} className={`${btn} bg-gold text-sage-900 hover:bg-gold-light text-sm font-semibold`}>
              {saved ? "✓ Tersimpan!" : "💾 Simpan"}
            </button>
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto">
          {TABS.map((t) => <button key={t} onClick={() => setTab(t)} className={tabCls(tab === t)}>{t}</button>)}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {tab === "Mempelai" && (
          <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {[["groom", "Nama Mempelai Pria"], ["bride", "Nama Mempelai Wanita"],
              ["groomFather", "Orang tua pria"], ["brideFather", "Orang tua wanita"],
            ].map(([k, l]) => (
              <div key={k}>
                <p className={label}>{l}</p>
                <input value={String(cfg[k as keyof WeddingConfig] ?? "")}
                  onChange={(e) => set(k as keyof WeddingConfig, e.target.value as never)} className={`${input} mt-1`} />
              </div>
            ))}
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {[["heroPhoto", "Foto Hero / Sampul"], ["groomPhoto", "Foto Mempelai Pria"], ["bridePhoto", "Foto Mempelai Wanita"]].map(([k, l]) => (
              <div key={k} className="bg-white rounded-2xl border border-sage-100 p-4">
                <p className={label}>{l}</p>
                <img src={String(cfg[k as keyof WeddingConfig] ?? "")} alt={l}
                  className="w-full h-40 object-cover rounded-xl mt-2 bg-sage-50" loading="lazy" />
                <input value={String(cfg[k as keyof WeddingConfig] ?? "")} placeholder="https://... atau link Google Drive"
                  onChange={(e) => set(k as keyof WeddingConfig, convertDriveUrl(e.target.value.trim()) as never)} className={`${input} mt-2`} />
                <button
                  onClick={() => pickFile("image/*", (f) => handleUpload(k, f, "photo",
                    (url) => set(k as keyof WeddingConfig, url as never)))}
                  disabled={uploading === k}
                  className={`${btn} w-full mt-2 ${canUpload ? "bg-sage-700 text-cream hover:bg-sage-800" : "bg-sage-100 text-sage-400"} disabled:opacity-60`}>
                  {uploading === k ? "Mengupload..." : "⬆ Upload foto"}
                </button>
              </div>
            ))}
          </div>
          </div>
        )}

        {tab === "Acara" && (
          <div className="grid md:grid-cols-2 gap-4">
            <div><p className={label}>Tanggal (ISO)</p>
              <input value={cfg.dateISO} onChange={(e) => set("dateISO", e.target.value)} className={`${input} mt-1`} placeholder="2026-12-20T08:00:00+07:00" /></div>
            <div><p className={label}>Tanggal tampil</p>
              <input value={cfg.dateText} onChange={(e) => set("dateText", e.target.value)} className={`${input} mt-1`} /></div>
            {(["akad", "resepsi"] as const).map((ev) => (
              <div key={ev} className="bg-white rounded-2xl border border-sage-100 p-5 space-y-3">
                <h3 className="font-serif2 text-lg font-semibold capitalize">{ev}</h3>
                {(["time", "place", "address"] as const).map((f) => (
                  <div key={f}><p className={label}>{f}</p>
                    <input value={cfg[ev][f]} onChange={(e) => set(ev, { ...cfg[ev], [f]: e.target.value })} className={`${input} mt-1`} /></div>
                ))}
              </div>
            ))}
            <div className="md:col-span-2"><p className={label}>Google Maps URL</p>
              <input value={cfg.mapsUrl} onChange={(e) => set("mapsUrl", e.target.value)} className={`${input} mt-1`} /></div>
          </div>
        )}

        {tab === "Galeri" && (
          <div className="space-y-3">
            {cfg.gallery.map((url, i) => (
              <div key={i} className="flex gap-2 items-center bg-white rounded-2xl border p-3">
                <img src={url} alt="" className="w-16 h-16 object-cover rounded-xl" loading="lazy" />
                <input value={url} placeholder="https://... atau link Google Drive" onChange={(e) => {
                  const g = [...cfg.gallery]; g[i] = convertDriveUrl(e.target.value.trim()); set("gallery", g);
                }} className={input} />
                <button onClick={() => set("gallery", cfg.gallery.filter((_, j) => j !== i))}
                  className={`${btn} bg-red-50 text-red-600 hover:bg-red-100`}>✕</button>
              </div>
            ))}
            <div className="flex gap-2">
              <button onClick={() => set("gallery", [...cfg.gallery, "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80"])}
                className={`${btn} bg-sage-100 text-sage-800 hover:bg-sage-200`}>＋ Tambah via URL</button>
              <button
                onClick={() => pickFile("image/*", (f) => handleUpload("gallery-new", f, "photo",
                  (url) => set("gallery", [...cfg.gallery, url])))}
                disabled={uploading === "gallery-new"}
                className={`${btn} ${canUpload ? "bg-sage-700 text-cream hover:bg-sage-800" : "bg-sage-100 text-sage-400"} disabled:opacity-60`}>
                {uploading === "gallery-new" ? "Mengupload..." : "⬆ Upload foto"}
              </button>
            </div>
            {!canUpload && <p className="text-xs text-amber-700">Upload butuh Cloudinary di .env (gratis). Sementara pakai URL / Google Drive.</p>}
          </div>
        )}

        {tab === "Story" && (
          <div className="space-y-3">
            {cfg.story.map((s, i) => (
              <div key={i} className="bg-white rounded-2xl border p-4 space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <input value={s.year} placeholder="Tahun" onChange={(e) => {
                    const st = [...cfg.story]; st[i] = { ...s, year: e.target.value }; set("story", st);
                  }} className={input} />
                  <input value={s.title} placeholder="Judul" onChange={(e) => {
                    const st = [...cfg.story]; st[i] = { ...s, title: e.target.value }; set("story", st);
                  }} className={`${input} col-span-2`} />
                </div>
                <textarea value={s.text} rows={2} onChange={(e) => {
                  const st = [...cfg.story]; st[i] = { ...s, text: e.target.value }; set("story", st);
                }} className={input} />
                <button onClick={() => set("story", cfg.story.filter((_, j) => j !== i))}
                  className="text-sm text-red-600 hover:underline">Hapus</button>
              </div>
            ))}
            <button onClick={() => set("story", [...cfg.story, { year: "2026", title: "Judul baru", text: "Cerita..." }])}
              className={`${btn} bg-sage-100 text-sage-800 hover:bg-sage-200`}>＋ Tambah story</button>
          </div>
        )}

        {tab === "Tamu" && (
          <div className="space-y-4 max-w-3xl">
            {!isSheetsConfigured ? (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-900">
                Daftar tamu butuh backend Sheets. Isi <code>VITE_SHEETS_API_URL</code> + <code>VITE_SHEETS_TOKEN</code> di .env,
                lalu deploy ulang Apps Script sebagai <b>New version</b>.
              </div>
            ) : (
              <>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (await addGuest(guestName)) setGuestName("");
                  }}
                  className="flex gap-2"
                >
                  <input value={guestName} onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Nama tamu, misal: Keluarga Budi" className={input} />
                  <button disabled={guestsBusy} className={`${btn} bg-sage-700 text-cream hover:bg-sage-800 whitespace-nowrap disabled:opacity-60`}>
                    ＋ Tambah
                  </button>
                </form>
                <p className="text-xs text-sage-500">
                  Setiap tamu mendapat <b>link personal</b> — cover undangan otomatis menampilkan namanya
                  (bukan lagi "Bapak/Ibu/Saudara/i"). Bagikan via WhatsApp.
                </p>
                <div className="bg-white rounded-2xl border overflow-hidden">
                  <div className="grid grid-cols-[3rem_1fr_auto] gap-2 px-4 py-2 bg-sage-50 text-xs font-semibold text-sage-600 uppercase">
                    <span>No</span><span>Guest Name</span><span>Aksi</span>
                  </div>
                  {guests.map((g) => (
                    <div key={g.no} className="grid grid-cols-[3rem_1fr_auto] gap-2 px-4 py-3 border-t items-center">
                      <span className="tabular-nums text-sage-500">{g.no}</span>
                      <span className="font-medium truncate">{g.name}</span>
                      <span className="flex gap-1.5">
                        <button
                          onClick={() => { navigator.clipboard?.writeText(guestLink(g.name)); alert("Link tersalin:\n" + guestLink(g.name)); }}
                          className="text-xs bg-sage-100 hover:bg-sage-200 rounded-lg px-3 py-1.5">⧉ Link</button>
                        <a
                          href={`https://wa.me/?text=${encodeURIComponent("Assalamu'alaikum, mohon doa restu 🙏\n" + guestLink(g.name))}`}
                          target="_blank" rel="noreferrer"
                          className="text-xs bg-green-100 text-green-800 hover:bg-green-200 rounded-lg px-3 py-1.5">WA</a>
                        <button
                          onClick={() => { if (confirm(`Hapus ${g.name}?`)) removeGuest(g.no); }}
                          className="text-xs bg-red-50 text-red-600 hover:bg-red-100 rounded-lg px-3 py-1.5">✕</button>
                      </span>
                    </div>
                  ))}
                  {!guests.length && <p className="px-4 py-6 text-sm text-sage-400 text-center">Belum ada tamu. Tambahkan di atas.</p>}
                </div>
                <p className="text-xs text-sage-500">Total: {guests.length} tamu • tersimpan di tab "Guests" pada spreadsheet.</p>
              </>
            )}
          </div>
        )}

        {tab === "Gift & Musik" && (
          <div className="space-y-4">
            {cfg.gifts.map((g, i) => (
              <div key={i} className="bg-white rounded-2xl border p-4 grid md:grid-cols-3 gap-2">
                <input value={g.bank} placeholder="Bank" onChange={(e) => {
                  const gs = [...cfg.gifts]; gs[i] = { ...g, bank: e.target.value }; set("gifts", gs);
                }} className={input} />
                <input value={g.number} placeholder="Nomor" onChange={(e) => {
                  const gs = [...cfg.gifts]; gs[i] = { ...g, number: e.target.value }; set("gifts", gs);
                }} className={input} />
                <div className="flex gap-2">
                  <input value={g.name} placeholder="a.n." onChange={(e) => {
                    const gs = [...cfg.gifts]; gs[i] = { ...g, name: e.target.value }; set("gifts", gs);
                  }} className={input} />
                  <button onClick={() => set("gifts", cfg.gifts.filter((_, j) => j !== i))}
                    className={`${btn} bg-red-50 text-red-600`}>✕</button>
                </div>
              </div>
            ))}
            <button onClick={() => set("gifts", [...cfg.gifts, { bank: "BCA", number: "", name: "" }])}
              className={`${btn} bg-sage-100 text-sage-800 hover:bg-sage-200`}>＋ Tambah rekening</button>
            <div><p className={label}>URL Musik latar</p>
              <input value={cfg.musicUrl} placeholder="https://... atau link Google Drive"
                onChange={(e) => set("musicUrl", convertDriveAudio(e.target.value.trim()))} className={`${input} mt-1`} />
              <div className="flex gap-2 mt-2 items-center">
                <button
                  onClick={() => pickFile("audio/*", (f) => handleUpload("music", f, "audio",
                    (url) => set("musicUrl", url)))}
                  disabled={uploading === "music"}
                  className={`${btn} ${canUpload ? "bg-sage-700 text-cream hover:bg-sage-800" : "bg-sage-100 text-sage-400"} disabled:opacity-60`}>
                  {uploading === "music" ? "Mengupload..." : "⬆ Upload MP3 (maks 15MB)"}
                </button>
                {cfg.musicUrl && <audio src={cfg.musicUrl} controls className="h-9" />}
              </div>
            </div>
          </div>
        )}

        {tab === "Backup" && (
          <div className="space-y-4 max-w-2xl">
            <div className="bg-white rounded-2xl border p-5">
              <h3 className="font-semibold">Export / Import</h3>
              <div className="flex gap-2 mt-3 flex-wrap">
                <button onClick={exportJSON} className={`${btn} bg-sage-700 text-cream hover:bg-sage-800`}>⬇ Download JSON</button>
                <button onClick={() => { navigator.clipboard?.writeText(JSON.stringify(cfg, null, 2)); alert("Disalin!"); }}
                  className={`${btn} bg-sage-100 hover:bg-sage-200`}>⧉ Salin JSON</button>
                <button onClick={async () => { if (confirm("Reset ke bawaan (data.ts)?")) { await resetConfig(); setCfg(loadLocal()); } }}
                  className={`${btn} bg-red-50 text-red-600 hover:bg-red-100`}>↺ Reset bawaan</button>
              </div>
              <p className={label + " mt-5"}>Import JSON</p>
              <textarea value={importText} onChange={(e) => setImportText(e.target.value)} rows={5}
                placeholder='Paste {"groom": ...} di sini' className={`${input} mt-1 font-mono`} />
              <button onClick={doImport} className={`${btn} bg-sage-700 text-cream mt-2`}>Import</button>
            </div>
            <div className="bg-white rounded-2xl border p-5">
              <h3 className="font-semibold">Ganti password admin</h3>
              <p className="text-xs text-sage-500">Default: {DEFAULT_PASSWORD}</p>
              <div className="flex gap-2 mt-2">
                <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Password baru" className={input} />
                <button onClick={() => { if (newPw.length >= 4) { changePassword(newPw); setNewPw(""); alert("Password diganti."); } }}
                  className={`${btn} bg-sage-700 text-cream`}>Ganti</button>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-900">
              <b>Catatan:</b> jika <code>VITE_SHEETS_API_URL</code> terisi, tombol Simpan
              otomatis menulis ke Google Sheets sehingga semua tamu melihat perubahan.
              Tanpa itu, data hanya tersimpan di browser ini — gunakan Download JSON
              lalu paste ke <code>src/data.ts</code>.
            </div>
          </div>
        )}

        <div className="sticky bottom-4 mt-8 flex justify-center">
          <button onClick={save} className="bg-sage-800 text-cream rounded-full px-10 py-3.5 shadow-2xl font-medium hover:bg-sage-900">
            {saved ? "✓ Tersimpan!" : "💾 Simpan Perubahan"}
          </button>
        </div>
      </main>
    </div>
  );
}
