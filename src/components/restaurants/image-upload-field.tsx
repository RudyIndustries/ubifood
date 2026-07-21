"use client";

import { useRef, useState } from "react";
import { ImageIcon, LoaderCircle, Trash2, Upload } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type ImageUploadFieldProps = {
  inputName: string;
  label: string;
  defaultValue?: string | null;
  ownerId: string;
  restaurantId?: string | null;
  folder: "covers" | "menu";
  onValueChange?: (url: string) => void;
};

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

function extensionFor(file: File) {
  const typeExtension: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/avif": "avif",
  };
  return typeExtension[file.type] ?? "jpg";
}

export function ImageUploadField({
  inputName,
  label,
  defaultValue,
  ownerId,
  restaurantId,
  folder,
  onValueChange,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(defaultValue ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateValue = (nextValue: string) => {
    setValue(nextValue);
    onValueChange?.(nextValue);
  };

  const uploadFile = async (file: File) => {
    setError(null);
    if (!restaurantId) {
      setError("Guarda primero el restaurante para habilitar archivos.");
      return;
    }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Usa una imagen JPG, PNG, WebP o AVIF.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("La imagen debe pesar menos de 5 MB.");
      return;
    }

    setUploading(true);
    const path = `${ownerId}/${restaurantId}/${folder}/${crypto.randomUUID()}.${extensionFor(file)}`;
    const supabase = createSupabaseBrowserClient();
    const { error: uploadError } = await supabase.storage
      .from("restaurant-media")
      .upload(path, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      setError(
        uploadError.message.toLowerCase().includes("bucket")
          ? "Falta configurar el bucket restaurant-media."
          : uploadError.message,
      );
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("restaurant-media").getPublicUrl(path);
    updateValue(data.publicUrl);
    setUploading(false);
  };

  return (
    <div>
      <span className="text-sm font-bold text-black/65">{label}</span>
      <input type="hidden" name={inputName} value={value} />
      <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
        <label className="relative block">
          <ImageIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-black/35" size={18} />
          <input
            type="url"
            value={value}
            onChange={(event) => updateValue(event.target.value)}
            className="h-11 w-full rounded-lg border border-black/10 bg-white pl-10 pr-3 text-sm font-semibold outline-none ring-[#277da1]/20 focus:ring-4"
            placeholder="Pega una URL o sube un archivo"
          />
        </label>
        <div className="flex gap-1">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void uploadFile(file);
              event.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading || !restaurantId}
            title={restaurantId ? "Subir imagen" : "Guarda primero el restaurante"}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#277da1] px-3 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-45"
          >
            {uploading ? <LoaderCircle size={17} className="animate-spin" /> : <Upload size={17} />}
            {uploading ? "Subiendo" : "Subir"}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => updateValue("")}
              title="Quitar imagen"
              aria-label="Quitar imagen"
              className="grid size-11 place-items-center rounded-lg bg-[#fff0ed] text-[#a32323]"
            >
              <Trash2 size={17} />
            </button>
          )}
        </div>
      </div>
      {error && <p className="mt-2 text-xs font-bold text-[#a32323]">{error}</p>}
    </div>
  );
}
