/**
 * BACKEND UNDANGAN → GOOGLE SHEETS (gratis, tanpa kartu kredit)
 *
 * CARA PASANG (5 menit):
 * 1. Buat Google Sheet baru, misal "Undangan Wedding".
 * 2. Di Sheet: Extensions → Apps Script → hapus isi editor → paste SELURUH file ini → Save.
 * 3. STRUKTUR SHEET (dibuat otomatis saat pertama dipanggil):
 *    - tab "Wishes": No | Guest Name | Ucapan | Kehadiran | Jml Tamu | Timestamp
 *    - tab "Guests": No | Guest Name  (daftar tamu + link undangan personal)
 *    - tab "Config": sel A1 = JSON konfigurasi.
 * 4. Deploy → New deployment → tipe "Web app":
 *    - Execute as: Me
 *    - Who has access: Anyone
 *    - Deploy → copy URL ".../exec" → masukkan ke .env sebagai VITE_SHEETS_API_URL
 * 5. Ganti TOKEN di bawah dengan password acak → masukkan juga ke .env (VITE_SHEETS_TOKEN).
 *    Token melindungi saveConfig agar hanya admin yang bisa mengubah.
 */

// ⬇️ GANTI dengan token acak milikmu (samakan dengan VITE_SHEETS_TOKEN di .env)
const ADMIN_TOKEN = "GANTI-DENGAN-TOKEN-ACAK-PANJANG";

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function sheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function ensureWishesHeader() {
  const sh = sheet("Wishes");
  if (sh.getLastRow() === 0) sh.appendRow(["No", "Guest Name", "Ucapan", "Kehadiran", "Jml Tamu", "Timestamp"]);
  return sh;
}

function ensureGuestsHeader() {
  const sh = sheet("Guests");
  if (sh.getLastRow() === 0) sh.appendRow(["No", "Guest Name"]);
  return sh;
}

function nextNo(sh) {
  return sh.getLastRow(); // baris 1 = header, jadi No berikutnya = jumlah baris saat ini
}

// GET: ?action=getConfig | ?action=getWishes | ?action=getGuests
function doGet(e) {
  const action = (e.parameter.action || "");
  if (action === "getWishes") {
    const sh = ensureWishesHeader();
    const rows = sh.getDataRange().getValues();
    const wishes = [];
    for (let i = 1; i < rows.length; i++) {
      wishes.push({ no: rows[i][0], name: rows[i][1], msg: rows[i][2], attend: rows[i][3], guests: rows[i][4], at: rows[i][5] });
    }
    wishes.sort((a, b) => b.at - a.at);
    return json({ wishes: wishes.slice(0, 100) });
  }
  if (action === "getGuests") {
    const sh = ensureGuestsHeader();
    const rows = sh.getDataRange().getValues();
    const guests = [];
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][1]) guests.push({ no: rows[i][0], name: rows[i][1] });
    }
    return json({ guests: guests });
  }
  if (action === "getConfig") {
    const cfg = sheet("Config").getRange("A1").getValue();
    return json({ config: cfg ? JSON.parse(cfg) : null });
  }
  return json({ ok: true, msg: "wedding backend aktif" });
}

// POST (kirim sebagai text/plain agar lolos CORS): { action, token?, config?, wish? }
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.action === "addWish") {
      const w = body.wish || {};
      const name = String(w.name || "").slice(0, 100);
      const msg = String(w.msg || "").slice(0, 1000);
      if (!name || !msg) return json({ ok: false, error: "nama/pesan kosong" });
      const sh = ensureWishesHeader();
      sh.appendRow([nextNo(sh), name, msg, String(w.attend || "Hadir").slice(0, 30), String(w.guests || "1").slice(0, 5), Date.now()]);
      return json({ ok: true });
    }
    if (body.action === "addGuest") {
      if (body.token !== ADMIN_TOKEN) return json({ ok: false, error: "token salah" });
      const name = String((body.guest && body.guest.name) || "").slice(0, 100);
      if (!name) return json({ ok: false, error: "nama kosong" });
      const sh = ensureGuestsHeader();
      const no = nextNo(sh);
      sh.appendRow([no, name]);
      return json({ ok: true, no: no });
    }
    if (body.action === "deleteGuest") {
      if (body.token !== ADMIN_TOKEN) return json({ ok: false, error: "token salah" });
      const sh = ensureGuestsHeader();
      const rows = sh.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === body.no) { sh.deleteRow(i + 1); break; }
      }
      return json({ ok: true });
    }
    if (body.action === "saveConfig") {
      if (body.token !== ADMIN_TOKEN) return json({ ok: false, error: "token salah" });
      sheet("Config").getRange("A1").setValue(JSON.stringify(body.config || {}));
      return json({ ok: true });
    }
    return json({ ok: false, error: "action tidak dikenal" });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}
