// ============================================================
// SERVER FUNCTION — Upload de Imagem de Produto
// Feirinha Orgânica Terra Viva
// Usa supabaseAdmin (service role) → bypassa RLS completamente
// ============================================================

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase";

const uploadSchema = z.object({
  fileBase64: z.string().min(1, "Arquivo vazio"),
  fileName: z.string().min(1, "Nome do arquivo obrigatório"),
  contentType: z.string().default("image/jpeg"),
});

export const uploadProductImage = createServerFn({ method: "POST" })
  .validator(uploadSchema)
  .handler(async ({ data }) => {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      throw new Error("Supabase admin não configurado");
    }

    try {
      const base64Data = data.fileBase64.split(",")[1] || data.fileBase64;
      const buffer = Buffer.from(base64Data, "base64");

      if (buffer.length > 5 * 1024 * 1024) {
        throw new Error("Arquivo muito grande. Máximo 5MB.");
      }

      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
      if (!allowedTypes.includes(data.contentType)) {
        throw new Error("Tipo de arquivo não suportado. Use JPEG, PNG ou WebP.");
      }

      const timestamp = Date.now();
      const random = Math.random().toString(36).slice(2, 10);
      const ext = data.fileName.split(".").pop() || "jpg";
      const filePath = `products/${timestamp}-${random}.${ext}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from("products")
        .upload(filePath, buffer, {
          contentType: data.contentType,
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("[uploadProductImage] Erro upload:", uploadError);
        throw new Error(`Erro no upload: ${uploadError.message}`);
      }

      const { data: publicUrlData } = supabaseAdmin.storage
        .from("products")
        .getPublicUrl(filePath);

      if (!publicUrlData?.publicUrl) {
        throw new Error("Erro ao gerar URL pública da imagem.");
      }

      return {
        success: true,
        url: publicUrlData.publicUrl,
        path: filePath,
      };
    } catch (err) {
      console.error("[uploadProductImage] Erro:", err);
      const message = err instanceof Error ? err.message : "Erro desconhecido no upload";
      throw new Error(message);
    }
  });