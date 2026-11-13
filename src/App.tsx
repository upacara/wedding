import { useEffect, useMemo, useRef, useState } from "react";
import { useCmsConfig, useWishes } from "./store";

function useCountdown(target: string) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, new Date(target).getTime() - now);
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor(diff / 3600000) % 24,
    mins: Math.floor(diff / 60000) % 60,
    secs: Math.floor(diff / 1000) % 60,
    done: diff <= 0,
  };
}

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && e.target.classList.add("visible")),
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

function guestName(): string {
  const p = new URLSearchParams(window.location.search).get("to");
  return p ? decodeURIComponent(p) : "Bapak/Ibu/Saudara/i";
}

export default function App() {
  const [opened, setOpened] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [rsvp, setRsvp] = useState({ name: "", attend: "Hadir", guests: "1", msg: "" });
  const { wishes, sending, send } = useWishes();
  const seedWishes = wishes;
  const cms = useCmsConfig();
  const WEDDING = cms;
  const GALLERY = cms.gallery;
  const STORY = cms.story;
  const audioRef = useRef<HTMLAudioElement>(null);
  const cd = useCountdown(cms.dateISO);
  const guest = useMemo(guestName, []);
  useReveal();

  useEffect(() => {
    document.body.style.overflow = opened ? "" : "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [opened ]);

  // Judul tab browser mengikuti nama mempelai dari admin
  useEffect(() => {
    const g = WEDDING.groom.split(" ")[0];
    const b = WEDDING.bride.split(" ")[0];
    document.title = `${g} & ${b} — Wedding Invitation`;
  }, [WEDDING.groom, WEDDING.bride]);

  const openInvite = () => {
    setOpened(true);
    setPlaying(true);
    audioRef.current?.play().catch(() => {});
    setTimeout(() => document.getElementById("couple")?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const toggleMusic = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play().catch(() => {}); setPlaying(true); }
  };

  const copy = (text: string) => {
    navigator.clipboard?.writeText(text.replace(/\s/g, ""));
    setCopied(text);
    setTimeout(() => setCopied(null), 1800);
  };

  const submitRsvp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rsvp.name.trim() || !rsvp.msg.trim()) return;
    const ok = await send({ name: rsvp.name.trim(), msg: rsvp.msg.trim(), attend: rsvp.attend, guests: rsvp.guests });
    if (ok) setRsvp({ name: "", attend: "Hadir", guests: "1", msg: "" });
  };

  return (
    <div className="min-h-screen bg-cream text-sage-900">
      <audio ref={audioRef} loop src={cms.musicUrl} />

      {/* COVER */}
      {!opened && (
        <div className="fixed inset-0 z-50 flex items-center justify-center text-center px-6"
          style={{ background: "linear-gradient(160deg,#2f3a2d 0%,#43563f 45%,#6b8763 100%)" }}>
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: `url('${WEDDING.heroPhoto}')`,
            backgroundSize: "cover", backgroundPosition: "center" }} />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/60" />
          <div className="relative max-w-md w-full bg-cream/95 backdrop-blur rounded-[2rem] p-10 shadow-2xl fade-up">
            <p className="tracking-[0.35em] text-xs text-sage-600 uppercase">The Wedding Of</p>
            <h1 className="font-script text-5xl mt-3 text-sage-800">{WEDDING.groom.split(" ")[0]} & {WEDDING.bride.split(" ")[0]}</h1>
            <div className="divider-floral my-5"><span className="text-gold">✦</span></div>
            <p className="text-sm text-sage-700">Kepada Yth.</p>
            <p className="font-serif2 text-2xl font-semibold mt-1">{guest}</p>
            <p className="text-xs text-sage-500 mt-2">*{WEDDING.dateText} — mohon maaf apabila ada kesalahan penulisan nama & gelar</p>
            <button onClick={openInvite} className="btn-pulse mt-7 w-full bg-sage-700 hover:bg-sage-800 text-cream rounded-full py-4 font-medium tracking-wide transition">
              ✉ &nbsp;Buka Undangan
            </button>
          </div>
        </div>
      )}

      {/* floating music */}
      {opened && (
        <button onClick={toggleMusic} aria-label="musik"
          className="fixed bottom-5 right-5 z-40 w-12 h-12 rounded-full bg-sage-800 text-cream shadow-xl flex items-center justify-center hover:scale-105 transition">
          {playing ? "♪" : "♫"}
          {playing && <span className="absolute inset-0 rounded-full border-2 border-gold animate-ping opacity-30" />}
        </button>
      )}

      {/* HERO */}
      <header className="relative min-h-[100svh] flex items-end justify-center text-center overflow-hidden">
        <img src={WEDDING.heroPhoto} alt="couple"
          className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/10 to-[#FAF7F0]" />
        <div className="relative pb-16 px-6 fade-up">
          <p className="text-cream/90 tracking-[0.4em] text-xs uppercase">Assalamu'alaikum • Kami Mengundang</p>
          <h1 className="font-script text-6xl md:text-7xl text-white mt-4 drop-shadow-lg">{WEDDING.groom.split(" ")[0]} & {WEDDING.bride.split(" ")[0]}</h1>
          <p className="text-cream/90 font-serif2 italic text-xl mt-2">{WEDDING.dateText}</p>
          <a href="#countdown" className="inline-block mt-6 bg-cream/95 text-sage-800 rounded-full px-8 py-3 text-sm tracking-widest uppercase hover:bg-white transition">Lihat Undangan ↓</a>
        </div>
      </header>

      {/* COUNTDOWN */}
      <section id="countdown" className="max-w-3xl mx-auto px-6 -mt-8 relative z-10">
        <div className="reveal bg-white rounded-3xl shadow-xl border border-sage-100 p-8 text-center">
          <p className="tracking-[0.3em] text-xs text-gold-dark uppercase">Menuju Hari Bahagia</p>
          <div className="grid grid-cols-4 gap-3 mt-5">
            {[[cd.days,"Hari"],[cd.hours,"Jam"],[cd.mins,"Menit"],[cd.secs,"Detik"]].map(([v,l]) => (
              <div key={l as string} className="bg-sage-50 rounded-2xl py-4 border border-sage-100">
                <div className="font-serif2 text-3xl md:text-4xl font-semibold tabular-nums">{String(v).padStart(2,"0")}</div>
                <div className="text-[11px] tracking-[0.25em] uppercase text-sage-500 mt-1">{l}</div>
              </div>
            ))}
          </div>
         {cd.done && (
            <p className="mt-4 font-serif2 italic text-lg">
              Alhamdulillah, acara telah berlangsung. Terima kasih atas doanya.
            </p>
          )}
          <a
            href={`https://calendar.google.com/calendar/render?${new URLSearchParams({
              action: "TEMPLATE",
              text: "Wedding Fajar & Aisyah",
              dates: "20261215T090000/20261215T140000",
              ctz: "Asia/Jakarta",
              location:
                "RM. Taman Dewi Sri, Jl. Raya Gayaman No.57, Gayaman, Kec. Mojoanyar, Kabupaten Mojokerto, Jawa Timur 61364",
              details:
                "Lokasi Google Maps: https://maps.app.goo.gl/GuDpMwZSmiAt2HMd9\nUndangan Digital: https://wedding.fajarrachmadi.my.id",
            }).toString()}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-6 border border-sage-700 text-sage-800 rounded-full px-7 py-2.5 text-sm hover:bg-sage-700 hover:text-cream transition"
          >
            ＋ Simpan Tanggal (Google Calendar)
          </a>
        </div>
      </section>

      {/* COUPLE */}
      <section id="couple" className="max-w-4xl mx-auto px-6 pt-20 pb-6 text-center">
        <p className="reveal tracking-[0.3em] text-xs text-gold-dark uppercase">Bismillahirrahmanirrahim</p>
        <p className="reveal font-serif2 italic text-lg text-sage-700 mt-4 max-w-2xl mx-auto">"Dan di antara tanda-tanda kebesaran-Nya ialah Dia menciptakan pasangan-pasangan untukmu agar kamu merasa tenteram, dan Dia menjadikan di antaramu rasa kasih dan sayang." — QS. Ar-Rūm: 21</p>
        <div className="grid md:grid-cols-2 gap-6 mt-12">
          {[{n:WEDDING.groom,p:WEDDING.groomFather,img:WEDDING.groomPhoto},
            {n:WEDDING.bride,p:WEDDING.brideFather,img:WEDDING.bridePhoto}].map((c) => (
            <div key={c.n} className="reveal bg-white rounded-3xl p-8 shadow-lg border border-sage-100">
              <img src={c.img} alt={c.n} className="w-36 h-36 object-cover rounded-full mx-auto ring-4 ring-gold-light shadow" loading="lazy" />
              <h3 className="font-script text-4xl mt-5 text-sage-800">{c.n}</h3>
              <p className="text-sm text-sage-500 mt-2">Putra/i dari<br />{c.p}</p>
            </div>
          ))}
        </div>
      </section>

      {/* EVENT */}
      <section className="max-w-4xl mx-auto px-6 py-14">
        <h2 className="reveal font-script text-5xl text-center text-sage-800">Save The Date</h2>
        <div className="divider-floral my-4 reveal"><span className="text-gold">✦</span></div>
        <div className="grid md:grid-cols-2 gap-6 mt-6">
          {[{t:"Akad Nikah",d:WEDDING.akad},{t:"Resepsi",d:WEDDING.resepsi}].map((e) => (
            <div key={e.t} className="reveal bg-sage-800 text-cream rounded-3xl p-8 text-center shadow-xl relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-gold/20" />
              <h3 className="font-serif2 text-2xl tracking-wide">{e.t}</h3>
              <p className="text-gold-light text-sm mt-1">{WEDDING.dateText}</p>
              <p className="mt-3 font-medium">{e.d.time}</p>
              <p className="font-serif2 italic text-lg mt-1">{e.d.place}</p>
              <p className="text-cream/70 text-sm mt-1">{e.d.address}</p>
              <a href={WEDDING.mapsUrl} target="_blank" rel="noreferrer" className="inline-block mt-5 bg-gold text-sage-900 rounded-full px-6 py-2.5 text-sm font-medium hover:bg-gold-light transition">📍 Lihat Google Maps</a>
            </div>
          ))}
        </div>
      </section>

      {/* STORY */}
      <section className="bg-sage-50 border-y border-sage-100">
        <div className="max-w-3xl mx-auto px-6 py-16">
          <h2 className="reveal font-script text-5xl text-center text-sage-800">Our Love Story</h2>
          <div className="mt-10 relative pl-8 border-l-2 border-gold/60 space-y-8">
            {STORY.map((s) => (
              <div key={s.year} className="reveal relative">
                <span className="absolute -left-[41px] top-1 w-5 h-5 rounded-full bg-gold ring-4 ring-gold-light" />
                <span className="text-xs tracking-[0.3em] text-gold-dark font-semibold">{s.year}</span>
                <h3 className="font-serif2 text-2xl font-semibold">{s.title}</h3>
                <p className="text-sage-600 mt-1 leading-relaxed">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GALLERY */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="reveal font-script text-5xl text-center text-sage-800">Gallery Momen</h2>
        <div className="divider-floral my-4 reveal"><span className="text-gold">✦</span></div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-6">
          {GALLERY.map((src, i) => (
            <div key={i} className={`gal reveal overflow-hidden rounded-2xl shadow ${i===0?"col-span-2 md:col-span-1 md:row-span-2":""}`}>
              <img src={src} alt={`galeri ${i+1}`} loading="lazy" className={`w-full object-cover ${i===0?"h-64 md:h-full min-h-[16rem]":"h-48 md:h-56"}`} />
            </div>
          ))}
        </div>
      </section>

      {/* RSVP + WISHES */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <h2 className="reveal font-script text-5xl text-center text-sage-800">RSVP & Ucapan</h2>
        <div className="grid md:grid-cols-2 gap-6 mt-8">
          <form onSubmit={submitRsvp} className="reveal bg-white rounded-3xl p-7 shadow-lg border border-sage-100 space-y-3">
            <label className="text-sm font-medium">Nama</label>
            <input value={rsvp.name} onChange={(e)=>setRsvp({...rsvp,name:e.target.value})} placeholder="Nama Anda" className="w-full border border-sage-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400 bg-cream" required />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Kehadiran</label>
                <select value={rsvp.attend} onChange={(e)=>setRsvp({...rsvp,attend:e.target.value})} className="w-full border border-sage-200 rounded-xl px-3 py-3 text-sm bg-cream">
                  <option>Hadir</option><option>Insya Allah Hadir</option><option>Berhalangan</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Jumlah tamu</label>
                <select value={rsvp.guests} onChange={(e)=>setRsvp({...rsvp,guests:e.target.value})} className="w-full border border-sage-200 rounded-xl px-3 py-3 text-sm bg-cream">
                  <option>1</option><option>2</option><option>3</option><option>4</option>
                </select>
              </div>
            </div>
            <label className="text-sm font-medium">Ucapan & doa</label>
            <textarea value={rsvp.msg} onChange={(e)=>setRsvp({...rsvp,msg:e.target.value})} rows={4} placeholder="Tulis doa terbaik..." className="w-full border border-sage-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sage-400 bg-cream" required />
            <button disabled={sending} className="w-full bg-sage-700 text-cream rounded-xl py-3 font-medium hover:bg-sage-800 transition disabled:opacity-60">{sending ? "Mengirim..." : "Kirim Konfirmasi & Ucapan"}</button>
            <p className="text-[11px] text-sage-500 text-center">Ucapan Anda akan tampil untuk semua tamu. Mohon gunakan kata-kata yang baik.</p>
          </form>
          <div className="reveal bg-sage-800 text-cream rounded-3xl p-7 shadow-lg">
            <h3 className="font-serif2 text-xl"> wishes ({seedWishes.length})</h3>
            <div className="noscroll mt-4 space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {seedWishes.map((w,i) => (
                <div key={i} className="bg-white/10 rounded-2xl p-4 border border-white/10">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gold-light text-sm">{w.name}</p>
                    <span className={`text-[10px] px-2 py-1 rounded-full ${w.attend.includes("Berhalangan")?"bg-red-400/30":"bg-green-400/30"}`}>{w.attend}</span>
                  </div>
                  <p className="text-sm text-cream/90 mt-1 leading-relaxed">{w.msg}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* GIFT */}
      <section className="bg-white border-t border-sage-100">
        <div className="max-w-2xl mx-auto px-6 py-16 text-center">
          <h2 className="reveal font-script text-5xl text-sage-800">Tanda Kasih</h2>
          <p className="reveal text-sage-600 mt-3 text-sm leading-relaxed">Kehadiran Anda adalah hadiah terindah. Namun jika berkenan memberi tanda kasih, kami sediakan dengan penuh syukur:</p>
          <div className="space-y-4 mt-8">
            {WEDDING.gifts.map((g) => (
              <div key={g.number} className="reveal bg-cream border border-gold/40 rounded-2xl p-6 shadow">
                <p className="tracking-[0.25em] text-xs text-gold-dark font-semibold">{g.bank}</p>
                <p className="font-serif2 text-3xl tracking-wider mt-2 tabular-nums">{g.number}</p>
                <p className="text-sm text-sage-500">a.n. {g.name}</p>
                <button onClick={()=>copy(g.number)} className="mt-4 border border-sage-700 rounded-full px-6 py-2 text-sm hover:bg-sage-700 hover:text-cream transition">
                  {copied===g.number ? "✓ Tersalin!" : "⧉ Salin Nomor"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="text-center px-6 py-14 text-cream" style={{ background: "linear-gradient(180deg,#43563f,#2f3a2d)" }}>
        <p className="text-sm text-cream/70">Merupakan suatu kehormatan & kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir & mendoakan.</p>
        <h2 className="font-script text-5xl mt-4">{WEDDING.groom.split(" ")[0]} & {WEDDING.bride.split(" ")[0]}</h2>
        <p className="text-xs tracking-[0.3em] uppercase mt-6 text-cream/50">wedding.fajarrachmadi.my.id • {new Date().getFullYear()}</p>
        <a href="#/admin" className="inline-block mt-3 text-[11px] text-cream/40 hover:text-cream/80 hover:underline">⚙ Admin</a>
      </footer>
    </div>
  );
}
