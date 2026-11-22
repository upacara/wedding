import { useEffect, useRef, useState } from "react";

export type PolaroidFrameId = "classic" | "cream-gold" | "sage" | "noir" | "none";

type FrameStyle = {
  id: PolaroidFrameId;
  label: string;
  swatch: string;
  bg: string;
  border?: string;
  innerBorder?: string;
  textPrimary: string;
  textSecondary: string;
};

const FRAMES: FrameStyle[] = [
  {
    id: "classic",
    label: "Classic White",
    swatch: "bg-white border-gray-300",
    bg: "#FFFFFF",
    border: "#E5E7EB",
    innerBorder: "#F3F4F6",
    textPrimary: "#1F2937",
    textSecondary: "#6B7280",
  },
  {
    id: "cream-gold",
    label: "Cream Gold",
    swatch: "bg-[#FAF7F2] border-[#C5A059]",
    bg: "#FAF7F2",
    border: "#C5A059",
    innerBorder: "#D4AF37",
    textPrimary: "#2F3E34",
    textSecondary: "#9A7B3E",
  },
  {
    id: "sage",
    label: "Sage Leaf",
    swatch: "bg-[#EBF0EC] border-[#7C9682]",
    bg: "#EBF0EC",
    border: "#9EB3A2",
    innerBorder: "#7C9682",
    textPrimary: "#243629",
    textSecondary: "#55705C",
  },
  {
    id: "noir",
    label: "Dark Film",
    swatch: "bg-[#1C1C1E] border-[#48484A]",
    bg: "#1C1C1E",
    border: "#3A3A3C",
    innerBorder: "#2C2C2E",
    textPrimary: "#F5F5F7",
    textSecondary: "#A1A1AA",
  },
  {
    id: "none",
    label: "Polos",
    swatch: "bg-gradient-to-tr from-sage-200 to-amber-100 border-sage-400",
    bg: "#FFFFFF",
    textPrimary: "#1F2937",
    textSecondary: "#6B7280",
  },
];

type PolaroidCameraProps = {
  defaultName?: string;
  coupleTitle?: string;
  dateLabel?: string;
  uploading: boolean;
  onSubmitPhoto: (file: File, name: string, caption: string) => Promise<boolean>;
};

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dWidth: number,
  dHeight: number
) {
  const sRatio = img.naturalWidth / img.naturalHeight;
  const dRatio = dWidth / dHeight;
  let sx = 0;
  let sy = 0;
  let sWidth = img.naturalWidth;
  let sHeight = img.naturalHeight;

  if (sRatio > dRatio) {
    sWidth = img.naturalHeight * dRatio;
    sx = (img.naturalWidth - sWidth) / 2;
  } else {
    sHeight = img.naturalWidth / dRatio;
    sy = (img.naturalHeight - sHeight) / 2;
  }

  ctx.drawImage(img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
}

function composePolaroid(
  img: HTMLImageElement,
  frame: FrameStyle,
  guestName: string,
  caption: string,
  coupleTitle: string,
  dateLabel: string
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  if (frame.id === "none") {
    canvas.width = 1080;
    canvas.height = 1080;
    drawImageCover(ctx, img, 0, 0, 1080, 1080);
    return canvas;
  }

  // Rasio Polaroid 1080 x 1340 px
  const W = 1080;
  const H = 1340;
  const pad = 64;
  const photoSize = W - pad * 2; // 952 x 952

  canvas.width = W;
  canvas.height = H;

  // Latar kertas Polaroid
  ctx.fillStyle = frame.bg;
  ctx.fillRect(0, 0, W, H);

  // Garis tepi luar tipis
  if (frame.border) {
    ctx.strokeStyle = frame.border;
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, W - 6, H - 6);
  }

  // Ornamen garis dalam untuk tema Cream Gold & Sage
  if ((frame.id === "cream-gold" || frame.id === "sage") && frame.innerBorder) {
    ctx.strokeStyle = frame.innerBorder;
    ctx.lineWidth = 2;
    ctx.strokeRect(24, 24, W - 48, H - 48);
  }

  // Foto utama (square center-crop)
  drawImageCover(ctx, img, pad, pad, photoSize, photoSize);

  // Bingkai dalam tipis mengelilingi foto
  ctx.strokeStyle = "rgba(0,0,0,0.08)";
  ctx.lineWidth = 2;
  ctx.strokeRect(pad, pad, photoSize, photoSize);

  // Area teks bagian bawah Polaroid
  const centerX = W / 2;
  const cleanCaption = caption.trim();
  const cleanGuest = guestName.trim();

  ctx.textAlign = "center";

  // Baris 1: Caption tamu atau kutipan default
  ctx.fillStyle = frame.textPrimary;
  ctx.font = "italic 34px Georgia, 'Times New Roman', serif";
  const mainLine = cleanCaption
    ? `"${cleanCaption.slice(0, 48)}${cleanCaption.length > 48 ? "..." : ""}"`
    : "Happily Ever After";
  ctx.fillText(mainLine, centerX, 1110, W - 140);

  // Baris 2: Nama Mempelai & Tanggal
  ctx.fillStyle = frame.textSecondary;
  ctx.font = "600 24px Georgia, 'Times New Roman', serif";
  ctx.fillText(`${coupleTitle}  •  ${dateLabel}`, centerX, 1185, W - 140);

  // Baris 3: Nama Tamu (jika diisi)
  if (cleanGuest) {
    ctx.fillStyle = frame.textSecondary;
    ctx.font = "22px sans-serif";
    ctx.fillText(`Captured by ${cleanGuest}`, centerX, 1235, W - 140);
  }

  return canvas;
}

export default function PolaroidCamera({
  defaultName = "",
  coupleTitle = "Fajar & Annisa",
  dateLabel = "15.12.2026",
  uploading,
  onSubmitPhoto,
}: PolaroidCameraProps) {
  const [mode, setMode] = useState<"camera" | "gallery">("camera");
  const [frameId, setFrameId] = useState<PolaroidFrameId>("cream-gold");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  const [rawImage, setRawImage] = useState<HTMLImageElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [finalFile, setFinalFile] = useState<File | null>(null);

  const [name, setName] = useState(defaultName);
  const [caption, setCaption] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  const activeFrame = FRAMES.find((f) => f.id === frameId) ?? FRAMES[0];

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  };

  // Kelola lifecycle kamera saat mode === "camera" dan belum ada hasil jepretan
  useEffect(() => {
    if (mode !== "camera" || rawImage) {
      stopStream();
      return;
    }

    let cancelled = false;
    setCameraError(null);
    setCameraReady(false);

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Browser ini tidak mendukung akses kamera langsung.");
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            width: { ideal: 1280 },
            height: { ideal: 1280 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraReady(true);
        }
      } catch {
        if (!cancelled) {
          setCameraError(
            "Kamera tidak dapat diakses (izin ditolak atau perangkat tidak memiliki kamera). Gunakan mode Pilih dari Galeri."
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [mode, facingMode, rawImage]);

  // Render ulang hasil Polaroid setiap kali foto mentah, frame, nama, atau caption berubah
  useEffect(() => {
    if (!rawImage) {
      setPreviewUrl(null);
      setFinalFile(null);
      return;
    }

    const canvas = composePolaroid(rawImage, activeFrame, name, caption, coupleTitle, dateLabel);
    setPreviewUrl(canvas.toDataURL("image/jpeg", 0.9));

    canvas.toBlob(
      (blob) => {
        if (blob) {
          setFinalFile(new File([blob], `polaroid_${Date.now()}.jpg`, { type: "image/jpeg" }));
        }
      },
      "image/jpeg",
      0.9
    );
  }, [rawImage, activeFrame, name, caption, coupleTitle, dateLabel]);

  const captureFromVideo = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const offscreen = document.createElement("canvas");
    offscreen.width = video.videoWidth;
    offscreen.height = video.videoHeight;
    const ctx = offscreen.getContext("2d")!;

    // Un-mirror jika memakai kamera depan agar hasil sesuai tampilan layar
    if (facingMode === "user") {
      ctx.translate(offscreen.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, offscreen.width, offscreen.height);

    const img = new Image();
    img.onload = () => setRawImage(img);
    img.src = offscreen.toDataURL("image/jpeg", 0.95);
  };

  const triggerShutter = (withTimer: boolean) => {
    if (!withTimer) {
      captureFromVideo();
      return;
    }
    setCountdown(3);
    let sec = 3;
    const interval = setInterval(() => {
      sec -= 1;
      if (sec > 0) {
        setCountdown(sec);
      } else {
        clearInterval(interval);
        setCountdown(null);
        captureFromVideo();
      }
    }, 1000);
  };

  const handlePickGalleryFile = (file: File) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      setRawImage(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      alert("File gambar tidak dapat dibaca.");
    };
    img.src = objectUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!finalFile) return;
    if (!name.trim()) {
      alert("Silakan isi nama Anda terlebih dahulu.");
      return;
    }
    const ok = await onSubmitPhoto(finalFile, name.trim(), caption.trim());
    if (ok) {
      setRawImage(null);
      setCaption("");
    }
  };

  return (
    <div className="bg-white/90 backdrop-blur rounded-3xl border border-sage-200/80 p-5 md:p-6 shadow-sm space-y-5">
      {/* Switcher Mode Kamera vs Galeri */}
      <div className="flex rounded-2xl bg-sage-100 p-1 gap-1">
        <button
          type="button"
          onClick={() => {
            setRawImage(null);
            setMode("camera");
          }}
          className={`flex-1 py-2.5 text-xs sm:text-sm font-medium rounded-xl transition ${
            mode === "camera" ? "bg-sage-800 text-cream shadow-sm" : "text-sage-700 hover:text-sage-900"
          }`}
        >
          📸 Kamera Polaroid
        </button>
        <button
          type="button"
          onClick={() => {
            setRawImage(null);
            setMode("gallery");
          }}
          className={`flex-1 py-2.5 text-xs sm:text-sm font-medium rounded-xl transition ${
            mode === "gallery" ? "bg-sage-800 text-cream shadow-sm" : "text-sage-700 hover:text-sage-900"
          }`}
        >
          🖼 Pilih dari Galeri
        </button>
      </div>

      {/* Pilihan Tema Frame Polaroid */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-sage-600 mb-2">
          Pilih Bingkai Polaroid
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FRAMES.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFrameId(f.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs whitespace-nowrap transition ${
                frameId === f.id
                  ? "border-sage-800 bg-sage-800 text-cream font-medium"
                  : "border-sage-200 bg-white text-sage-700 hover:bg-sage-50"
              }`}
            >
              <span className={`w-3.5 h-3.5 rounded-full border ${f.swatch}`} />
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Area Preview Live Kamera / Hasil Polaroid */}
      <div className="flex flex-col items-center">
        {previewUrl ? (
          <div className="w-full max-w-xs space-y-3">
            <img
              src={previewUrl}
              alt="Preview Polaroid"
              className="w-full rounded-2xl shadow-lg border border-sage-200"
            />
            <button
              type="button"
              onClick={() => setRawImage(null)}
              className="w-full py-2 text-xs font-medium rounded-xl bg-sage-100 text-sage-800 hover:bg-sage-200 transition"
            >
              ↺ {mode === "camera" ? "Foto Ulang" : "Ganti Foto"}
            </button>
          </div>
        ) : mode === "camera" ? (
          cameraError ? (
            <div className="w-full rounded-2xl bg-amber-50 border border-amber-200 p-5 text-center space-y-3">
              <p className="text-xs text-amber-900">{cameraError}</p>
              <button
                type="button"
                onClick={() => setMode("gallery")}
                className="px-4 py-2 rounded-xl bg-sage-800 text-cream text-xs font-medium"
              >
                Buka Galeri Foto
              </button>
            </div>
          ) : (
            <div className="w-full max-w-xs space-y-3">
              {/* Bingkai Live Overlay di atas Video Kamera */}
              <div
                style={{
                  backgroundColor: activeFrame.id === "none" ? "#000" : activeFrame.bg,
                  borderColor: activeFrame.border ?? "transparent",
                }}
                className={`relative rounded-2xl shadow-lg border transition-colors ${
                  activeFrame.id === "none" ? "p-0 overflow-hidden" : "p-3.5 pb-5"
                }`}
              >
                <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-black">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
                  />
                  {!cameraReady && (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-white/80 bg-black/60">
                      Menyiapkan kamera...
                    </div>
                  )}
                  {countdown !== null && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <span className="text-6xl font-bold text-white drop-shadow">{countdown}</span>
                    </div>
                  )}
                </div>

                {activeFrame.id !== "none" && (
                  <div className="pt-3 text-center select-none">
                    <p
                      style={{ color: activeFrame.textPrimary }}
                      className="font-serif2 italic text-xs truncate"
                    >
                      {caption.trim() ? `"${caption.trim()}"` : "Happily Ever After"}
                    </p>
                    <p
                      style={{ color: activeFrame.textSecondary }}
                      className="text-[10px] font-semibold tracking-wider mt-0.5"
                    >
                      {coupleTitle} • {dateLabel}
                    </p>
                  </div>
                )}
              </div>

              {/* Tombol Kontrol Kamera */}
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setFacingMode((m) => (m === "user" ? "environment" : "user"))}
                  className="px-3 py-2.5 rounded-xl bg-sage-100 text-sage-800 hover:bg-sage-200 text-xs font-medium"
                  title="Ganti Kamera Depan / Belakang"
                >
                  🔄 Balik
                </button>
                <button
                  type="button"
                  disabled={!cameraReady || countdown !== null}
                  onClick={() => triggerShutter(false)}
                  className="flex-1 py-2.5 rounded-xl bg-sage-800 text-cream hover:bg-sage-900 text-sm font-semibold shadow disabled:opacity-50"
                >
                  📸 Jepret
                </button>
                <button
                  type="button"
                  disabled={!cameraReady || countdown !== null}
                  onClick={() => triggerShutter(true)}
                  className="px-3 py-2.5 rounded-xl bg-sage-100 text-sage-800 hover:bg-sage-200 text-xs font-medium disabled:opacity-50"
                  title="Timer 3 Detik"
                >
                  ⏱ 3d
                </button>
              </div>
            </div>
          )
        ) : (
          <div className="w-full">
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handlePickGalleryFile(f);
              }}
            />
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="w-full py-10 border-2 border-dashed border-sage-300 rounded-2xl text-center hover:bg-sage-50 transition space-y-1"
            >
              <p className="text-sm font-medium text-sage-800">Klik untuk memilih foto dari galeri</p>
              <p className="text-xs text-sage-500">Bingkai Polaroid otomatis terpasang setelah foto dipilih</p>
            </button>
          </div>
        )}
      </div>

      {/* Form Identitas & Kirim ke Galeri Website */}
      <form onSubmit={handleSubmit} className="space-y-3 pt-1">
        <div className="grid sm:grid-cols-2 gap-2.5">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama Anda *"
            required
            className="w-full border border-sage-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sage-400"
          />
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Ucapan singkat di bawah Polaroid (opsional)"
            maxLength={60}
            className="w-full border border-sage-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sage-400"
          />
        </div>

        <button
          type="submit"
          disabled={!finalFile || uploading}
          className="w-full py-3 rounded-xl bg-sage-800 text-cream font-medium text-sm hover:bg-sage-900 transition disabled:opacity-40"
        >
          {uploading ? "Mengunggah Polaroid..." : "✨ Kirim Foto ke Galeri Momen"}
        </button>
      </form>
    </div>
  );
}