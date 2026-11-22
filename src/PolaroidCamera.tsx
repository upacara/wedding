import { useEffect, useRef, useState } from "react";

export type PolaroidFrameId = "classic" | "cream-gold" | "sage" | "noir" | "none";

type BuiltinFrameStyle = {
  id: PolaroidFrameId;
  label: string;
  swatch: string;
  bg: string;
  border?: string;
  innerBorder?: string;
  textPrimary: string;
  textSecondary: string;
};

type SlotRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CustomPngFrame = {
  id: string;
  label: string;
  candidateUrls: string[];
  width: number;
  height: number;
  slots: SlotRect[];
  showGuestCredit?: boolean;
  creditColor?: string;
};

type LoadedCustomFrame = {
  config: CustomPngFrame;
  processedCanvas: HTMLCanvasElement;
  processedUrl: string;
};

const BUILTIN_FRAMES: BuiltinFrameStyle[] = [
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

const CANDIDATE_CUSTOM_FRAMES: CustomPngFrame[] = [
  {
    id: "custom-jawa-floral",
    label: "Jawa & Floral (2 Pose)",
    candidateUrls: ["/frames/frame-1.png", "/frames/frame-1.jpg"],
    width: 1080,
    height: 1920,
    slots: [
      { x: 85, y: 95, width: 910, height: 630 },
      { x: 85, y: 765, width: 910, height: 630 },
    ],
    showGuestCredit: true,
    creditColor: "#6B5B4B",
  },
  {
    id: "custom-burgundy-lace",
    label: "Burgundy Lace (2 Pose)",
    candidateUrls: ["/frames/frame-2.png", "/frames/frame-2.jpg"],
    width: 1080,
    height: 1920,
    slots: [
      { x: 115, y: 125, width: 850, height: 615 },
      { x: 115, y: 775, width: 850, height: 615 },
    ],
    showGuestCredit: true,
    creditColor: "#F5EFE6",
  },
];

type PolaroidCameraProps = {
  defaultName?: string;
  coupleTitle?: string;
  dateLabel?: string;
  uploading: boolean;
  onSubmitPhoto: (file: File, name: string, caption: string) => Promise<boolean>;
};

/**
 * Mengubah area kotak putih (#FFFFFF) di dalam koordinat slot menjadi transparan,
 * sambil mempertahankan ornamen gunungan/bunga yang menimpa tepi foto tetap utuh.
 */
function buildTransparentOverlay(img: HTMLImageElement, config: CustomPngFrame): LoadedCustomFrame {
  const canvas = document.createElement("canvas");
  canvas.width = config.width;
  canvas.height = config.height;
  const ctx = canvas.getContext("2d")!;

  ctx.drawImage(img, 0, 0, config.width, config.height);

  for (const slot of config.slots) {
    const imgData = ctx.getImageData(slot.x, slot.y, slot.width, slot.height);
    const d = imgData.data;

    for (let i = 0; i < d.length; i += 4) {
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];
      const a = d[i + 3];

      if (a === 0) continue;

      // Piksel putih bersih di dalam window foto dijadikan transparan
      if (r > 232 && g > 232 && b > 232) {
        d[i + 3] = 0;
      } else if (r > 212 && g > 212 && b > 212) {
        // Penghalus tepi anti-aliasing di perbatasan ornamen
        const avg = (r + g + b) / 3;
        const factor = Math.max(0, Math.min(1, (232 - avg) / 20));
        d[i + 3] = Math.round(a * factor);
      }
    }

    ctx.putImageData(imgData, slot.x, slot.y);
  }

  return {
    config,
    processedCanvas: canvas,
    processedUrl: canvas.toDataURL("image/png"),
  };
}

function loadFirstValidImage(urls: string[]): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    let idx = 0;
    const tryNext = () => {
      if (idx >= urls.length) {
        resolve(null);
        return;
      }
      const url = urls[idx++];
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        if (img.naturalWidth > 0) resolve(img);
        else tryNext();
      };
      img.onerror = () => tryNext();
      img.src = url;
    };
    tryNext();
  });
}

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

function composeBuiltinPolaroid(
  img: HTMLImageElement,
  frame: BuiltinFrameStyle,
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

  const W = 1080;
  const H = 1340;
  const pad = 64;
  const photoSize = W - pad * 2;

  canvas.width = W;
  canvas.height = H;

  ctx.fillStyle = frame.bg;
  ctx.fillRect(0, 0, W, H);

  if (frame.border) {
    ctx.strokeStyle = frame.border;
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, W - 6, H - 6);
  }

  if ((frame.id === "cream-gold" || frame.id === "sage") && frame.innerBorder) {
    ctx.strokeStyle = frame.innerBorder;
    ctx.lineWidth = 2;
    ctx.strokeRect(24, 24, W - 48, H - 48);
  }

  drawImageCover(ctx, img, pad, pad, photoSize, photoSize);

  ctx.strokeStyle = "rgba(0,0,0,0.08)";
  ctx.lineWidth = 2;
  ctx.strokeRect(pad, pad, photoSize, photoSize);

  const centerX = W / 2;
  const cleanCaption = caption.trim();
  const cleanGuest = guestName.trim();

  ctx.textAlign = "center";
  ctx.fillStyle = frame.textPrimary;
  ctx.font = "italic 34px Georgia, 'Times New Roman', serif";
  const mainLine = cleanCaption
    ? `"${cleanCaption.slice(0, 48)}${cleanCaption.length > 48 ? "..." : ""}"`
    : "Happily Ever After";
  ctx.fillText(mainLine, centerX, 1110, W - 140);

  ctx.fillStyle = frame.textSecondary;
  ctx.font = "600 24px Georgia, 'Times New Roman', serif";
  ctx.fillText(`${coupleTitle}  •  ${dateLabel}`, centerX, 1185, W - 140);

  if (cleanGuest) {
    ctx.fillStyle = frame.textSecondary;
    ctx.font = "22px sans-serif";
    ctx.fillText(`Captured by ${cleanGuest}`, centerX, 1235, W - 140);
  }

  return canvas;
}

function composeCustomOverlay(
  shots: HTMLImageElement[],
  entry: LoadedCustomFrame,
  guestName: string
): HTMLCanvasElement {
  const { config, processedCanvas } = entry;
  const canvas = document.createElement("canvas");
  canvas.width = config.width;
  canvas.height = config.height;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#FAF7F2";
  ctx.fillRect(0, 0, config.width, config.height);

  config.slots.forEach((slot, idx) => {
    const shot = shots[idx] ?? shots[0];
    if (shot) {
      drawImageCover(ctx, shot, slot.x, slot.y, slot.width, slot.height);
    }
  });

  ctx.drawImage(processedCanvas, 0, 0, config.width, config.height);

  if (config.showGuestCredit && guestName.trim()) {
    ctx.textAlign = "center";
    ctx.fillStyle = config.creditColor || "#555555";
    ctx.font = "20px sans-serif";
    ctx.fillText(`Captured by ${guestName.trim()}`, config.width / 2, config.height - 26, config.width - 120);
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
  const [customFrames, setCustomFrames] = useState<LoadedCustomFrame[]>([]);
  const [selectedFrameId, setSelectedFrameId] = useState<string>("cream-gold");

  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  const [shots, setShots] = useState<HTMLImageElement[]>([]);
  const [shotPreviews, setShotPreviews] = useState<string[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [finalFile, setFinalFile] = useState<File | null>(null);

  const [name, setName] = useState(defaultName);
  const [caption, setCaption] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      CANDIDATE_CUSTOM_FRAMES.map(async (cfg) => {
        const img = await loadFirstValidImage(cfg.candidateUrls);
        if (!img) return null;
        return buildTransparentOverlay(img, cfg);
      })
    ).then((results) => {
      if (cancelled) return;
      const valid = results.filter((r): r is LoadedCustomFrame => r !== null);
      setCustomFrames(valid);
      if (valid.length > 0) {
        setSelectedFrameId(valid[0].config.id);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const activeCustomEntry = customFrames.find((entry) => entry.config.id === selectedFrameId) ?? null;
  const activeBuiltin = BUILTIN_FRAMES.find((f) => f.id === selectedFrameId) ?? BUILTIN_FRAMES[0];

  const requiredShots = activeCustomEntry ? activeCustomEntry.config.slots.length : 1;
  const isComplete = shots.length >= requiredShots;

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  };

  useEffect(() => {
    if (mode !== "camera" || isComplete) {
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
  }, [mode, facingMode, isComplete]);

  useEffect(() => {
    if (!isComplete || shots.length === 0) {
      setPreviewUrl(null);
      setFinalFile(null);
      return;
    }

    const canvas = activeCustomEntry
      ? composeCustomOverlay(shots, activeCustomEntry, name)
      : composeBuiltinPolaroid(shots[0], activeBuiltin, name, caption, coupleTitle, dateLabel);

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
  }, [isComplete, shots, activeCustomEntry, activeBuiltin, name, caption, coupleTitle, dateLabel]);

  const resetShots = () => {
    setShots([]);
    setShotPreviews([]);
    setPreviewUrl(null);
    setFinalFile(null);
  };

  const undoLastShot = () => {
    setShots((prev) => prev.slice(0, -1));
    setShotPreviews((prev) => prev.slice(0, -1));
  };

  const captureFromVideo = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const offscreen = document.createElement("canvas");
    offscreen.width = video.videoWidth;
    offscreen.height = video.videoHeight;
    const ctx = offscreen.getContext("2d")!;

    if (facingMode === "user") {
      ctx.translate(offscreen.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, offscreen.width, offscreen.height);

    const dataUrl = offscreen.toDataURL("image/jpeg", 0.95);
    const img = new Image();
    img.onload = () => {
      setShots((prev) => [...prev, img].slice(0, requiredShots));
      setShotPreviews((prev) => [...prev, dataUrl].slice(0, requiredShots));
    };
    img.src = dataUrl;
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

  const handlePickGalleryFiles = (fileList: FileList) => {
    const files = Array.from(fileList).slice(0, requiredShots - shots.length);
    files.forEach((file) => {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        c.getContext("2d")!.drawImage(img, 0, 0);
        const dataUrl = c.toDataURL("image/jpeg", 0.92);
        URL.revokeObjectURL(objectUrl);

        setShots((prev) => [...prev, img].slice(0, requiredShots));
        setShotPreviews((prev) => [...prev, dataUrl].slice(0, requiredShots));
      };
      img.onerror = () => URL.revokeObjectURL(objectUrl);
      img.src = objectUrl;
    });
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
      resetShots();
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
            resetShots();
            setMode("camera");
          }}
          className={`flex-1 py-2.5 text-xs sm:text-sm font-medium rounded-xl transition ${
            mode === "camera" ? "bg-sage-800 text-cream shadow-sm" : "text-sage-700 hover:text-sage-900"
          }`}
        >
          📸 Kamera Photobooth
        </button>
        <button
          type="button"
          onClick={() => {
            resetShots();
            setMode("gallery");
          }}
          className={`flex-1 py-2.5 text-xs sm:text-sm font-medium rounded-xl transition ${
            mode === "gallery" ? "bg-sage-800 text-cream shadow-sm" : "text-sage-700 hover:text-sage-900"
          }`}
        >
          🖼 Pilih dari Galeri
        </button>
      </div>

      {/* Pilihan Bingkai */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-sage-600 mb-2">
          Pilih Bingkai ({requiredShots > 1 ? `${requiredShots} Pose` : "1 Pose"})
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {customFrames.map(({ config }) => (
            <button
              key={config.id}
              type="button"
              onClick={() => {
                setSelectedFrameId(config.id);
                if (shots.length > config.slots.length) resetShots();
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs whitespace-nowrap transition ${
                selectedFrameId === config.id
                  ? "border-gold-dark bg-gold/25 text-sage-900 font-semibold"
                  : "border-sage-200 bg-white text-sage-700 hover:bg-sage-50"
              }`}
            >
              <span className="text-xs">✨</span>
              {config.label}
            </button>
          ))}

          {BUILTIN_FRAMES.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                setSelectedFrameId(f.id);
                if (shots.length > 1) {
                  setShots((prev) => prev.slice(0, 1));
                  setShotPreviews((prev) => prev.slice(0, 1));
                }
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs whitespace-nowrap transition ${
                selectedFrameId === f.id
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

      {/* Area Live Kamera / Preview Hasil */}
      <div className="flex flex-col items-center">
        {previewUrl ? (
          <div className="w-full max-w-xs space-y-3">
            <img
              src={previewUrl}
              alt="Preview Photobooth"
              className="w-full rounded-2xl shadow-lg border border-sage-200"
            />
            <button
              type="button"
              onClick={resetShots}
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
              {activeCustomEntry ? (
                <div
                  style={{
                    aspectRatio: `${activeCustomEntry.config.width} / ${activeCustomEntry.config.height}`,
                  }}
                  className="relative w-full rounded-2xl overflow-hidden shadow-lg border border-sage-200 bg-[#FAF7F2]"
                >
                  {activeCustomEntry.config.slots.map((slot, idx) => {
                    const leftPct = (slot.x / activeCustomEntry.config.width) * 100;
                    const topPct = (slot.y / activeCustomEntry.config.height) * 100;
                    const widthPct = (slot.width / activeCustomEntry.config.width) * 100;
                    const heightPct = (slot.height / activeCustomEntry.config.height) * 100;
                    const isCurrentSlot = idx === shots.length;

                    return (
                      <div
                        key={idx}
                        style={{
                          left: `${leftPct}%`,
                          top: `${topPct}%`,
                          width: `${widthPct}%`,
                          height: `${heightPct}%`,
                        }}
                        className="absolute overflow-hidden bg-neutral-900"
                      >
                        {shotPreviews[idx] ? (
                          <img
                            src={shotPreviews[idx]}
                            alt={`Pose ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        ) : isCurrentSlot ? (
                          <>
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
                                <span className="text-5xl font-bold text-white drop-shadow">{countdown}</span>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-white/60">
                            Pose {idx + 1}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Overlay yang sudah otomatis dilubangi area fotonya */}
                  <img
                    src={activeCustomEntry.processedUrl}
                    alt={activeCustomEntry.config.label}
                    className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none"
                  />
                </div>
              ) : (
                <div
                  style={{
                    backgroundColor: activeBuiltin.id === "none" ? "#000" : activeBuiltin.bg,
                    borderColor: activeBuiltin.border ?? "transparent",
                  }}
                  className={`relative rounded-2xl shadow-lg border transition-colors ${
                    activeBuiltin.id === "none" ? "p-0 overflow-hidden" : "p-3.5 pb-5"
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

                  {activeBuiltin.id !== "none" && (
                    <div className="pt-3 text-center select-none">
                      <p
                        style={{ color: activeBuiltin.textPrimary }}
                        className="font-serif2 italic text-xs truncate"
                      >
                        {caption.trim() ? `"${caption.trim()}"` : "Happily Ever After"}
                      </p>
                      <p
                        style={{ color: activeBuiltin.textSecondary }}
                        className="text-[10px] font-semibold tracking-wider mt-0.5"
                      >
                        {coupleTitle} • {dateLabel}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Tombol Kontrol Shutter */}
              <div className="flex items-center justify-center gap-2">
                {shots.length > 0 ? (
                  <button
                    type="button"
                    onClick={undoLastShot}
                    className="px-3 py-2.5 rounded-xl bg-amber-100 text-amber-900 hover:bg-amber-200 text-xs font-medium"
                  >
                    ↺ Ulang Pose {shots.length}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setFacingMode((m) => (m === "user" ? "environment" : "user"))}
                    className="px-3 py-2.5 rounded-xl bg-sage-100 text-sage-800 hover:bg-sage-200 text-xs font-medium"
                    title="Ganti Kamera Depan / Belakang"
                  >
                    🔄 Balik
                  </button>
                )}

                <button
                  type="button"
                  disabled={!cameraReady || countdown !== null}
                  onClick={() => triggerShutter(false)}
                  className="flex-1 py-2.5 rounded-xl bg-sage-800 text-cream hover:bg-sage-900 text-sm font-semibold shadow disabled:opacity-50"
                >
                  📸 Jepret{requiredShots > 1 ? ` Pose ${shots.length + 1}/${requiredShots}` : ""}
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
          /* MODE PILIH DARI GALERI */
          <div className="w-full space-y-3">
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              multiple={requiredShots > 1}
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) handlePickGalleryFiles(e.target.files);
                e.target.value = "";
              }}
            />

            {shotPreviews.length > 0 && (
              <div className="flex justify-center gap-2">
                {shotPreviews.map((src, i) => (
                  <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border border-sage-200">
                    <img src={src} alt={`Pose ${i + 1}`} className="w-full h-full object-cover" />
                    <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                      Pose {i + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="w-full py-9 border-2 border-dashed border-sage-300 rounded-2xl text-center hover:bg-sage-50 transition space-y-1"
            >
              <p className="text-sm font-medium text-sage-800">
                {requiredShots > 1
                  ? `Pilih foto untuk Pose ${shots.length + 1} dari ${requiredShots}`
                  : "Klik untuk memilih foto dari galeri"}
              </p>
              <p className="text-xs text-sage-500">
                {requiredShots > 1
                  ? "Bisa pilih langsung 2 foto sekaligus atau satu per satu"
                  : "Bingkai otomatis terpasang setelah foto dipilih"}
              </p>
            </button>
          </div>
        )}
      </div>

      {/* Form Nama & Kirim ke Galeri */}
      <form onSubmit={handleSubmit} className="space-y-3 pt-1">
        <div className={activeCustomEntry ? "grid grid-cols-1" : "grid sm:grid-cols-2 gap-2.5"}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama Anda *"
            required
            className="w-full border border-sage-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sage-400"
          />
          {!activeCustomEntry && (
            <input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Ucapan singkat di bawah Polaroid (opsional)"
              maxLength={60}
              className="w-full border border-sage-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sage-400"
            />
          )}
        </div>

        <button
          type="submit"
          disabled={!finalFile || uploading}
          className="w-full py-3 rounded-xl bg-sage-800 text-cream font-medium text-sm hover:bg-sage-900 transition disabled:opacity-40"
        >
          {uploading ? "Mengunggah Foto..." : "✨ Kirim Foto ke Galeri Momen"}
        </button>
      </form>
    </div>
  );
}
