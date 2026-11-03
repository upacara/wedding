// Upload file → Cloudinary (gratis, tanpa kartu kredit).
// Config di .env: VITE_CLOUDINARY_CLOUD + VITE_CLOUDINARY_PRESET (unsigned).
const CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD || "";
const PRESET = import.meta.env.VITE_CLOUDINARY_PRESET || "";
export const isCloudinaryConfigured = Boolean(CLOUD && PRESET);
export const canUpload = isCloudinaryConfigured;

/** Resize foto di browser (maks 1600px, JPEG 0.82) agar hemat kuota. */
export function compressImage(file: File, maxDim = 1600, quality = 0.82): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      c.getContext("2d")?.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(img.src);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error("compress failed"))), "image/jpeg", quality);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

async function uploadCloudinary(blob: Blob, filename: string, resource: "image" | "video"): Promise<string> {
  const form = new FormData();
  form.append("file", blob, filename);
  form.append("upload_preset", PRESET);
  form.append("folder", "wedding");
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/${resource}/upload`, {
    method: "POST", body: form,
  });
  if (!res.ok) throw new Error("Cloudinary upload gagal. Cek cloud name / unsigned preset.");
  const json = await res.json();
  return json.secure_url as string;
}

export const uploadPhoto = async (file: File) => {
  if (!canUpload) throw new Error("Isi Cloudinary di .env dulu (gratis, tanpa kartu).");
  const blob = await compressImage(file);
  return uploadCloudinary(blob, "photo.jpg", "image");
};

export const uploadAudio = async (file: File) => {
  if (file.size > 15 * 1024 * 1024) throw new Error("File musik maksimal 15MB.");
  if (!canUpload) throw new Error("Isi Cloudinary di .env dulu (gratis, tanpa kartu).");
  return uploadCloudinary(file, file.name, "video"); // audio tersimpan di bawah resource video/
};
