import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const BUCKET = "restaurant-media";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return errorResponse("Inicia sesión para subir imágenes.", 401);

  const formData = await request.formData();
  const file = formData.get("file");
  const restaurantId = String(formData.get("restaurantId") ?? "").trim();
  const folder = String(formData.get("folder") ?? "").trim();

  if (!(file instanceof File) || !restaurantId || !["covers", "menu"].includes(folder)) {
    return errorResponse("Los datos de la imagen no son válidos.", 400);
  }
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return errorResponse("Usa una imagen JPG, PNG, WebP o AVIF.", 400);
  }
  if (file.size > MAX_FILE_SIZE) {
    return errorResponse("La imagen debe pesar menos de 5 MB.", 400);
  }

  const [{ data: restaurant }, { data: profile }] = await Promise.all([
    supabase
      .from("restaurants")
      .select("id,owner_id")
      .eq("id", restaurantId)
      .maybeSingle<{ id: string; owner_id: string }>(),
    supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle<{ role: "admin" | "cliente" | "comercio" }>(),
  ]);

  if (!restaurant || (restaurant.owner_id !== user.id && profile?.role !== "admin")) {
    return errorResponse("No tienes permiso para modificar este restaurante.", 403);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !secretKey) {
    return errorResponse("El almacenamiento no está configurado en el servidor.", 503);
  }

  const admin = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: bucket } = await admin.storage.getBucket(BUCKET);

  if (!bucket) {
    const { error } = await admin.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: MAX_FILE_SIZE,
      allowedMimeTypes: ACCEPTED_TYPES,
    });
    if (error && !error.message.toLowerCase().includes("already")) {
      return errorResponse("No pudimos preparar el almacenamiento de imágenes.", 500);
    }
  } else if (!bucket.public) {
    const { error } = await admin.storage.updateBucket(BUCKET, {
      public: true,
      fileSizeLimit: MAX_FILE_SIZE,
      allowedMimeTypes: ACCEPTED_TYPES,
    });
    if (error) return errorResponse("No pudimos habilitar las imágenes públicas.", 500);
  }

  const path = `${user.id}/${restaurantId}/${folder}/${crypto.randomUUID()}.${EXTENSIONS[file.type]}`;
  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(path, await file.arrayBuffer(), {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) return errorResponse("No pudimos subir la imagen. Intenta nuevamente.", 500);

  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ publicUrl: data.publicUrl });
}
