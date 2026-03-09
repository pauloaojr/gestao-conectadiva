/**
 * Helpers para mídia de notificações.
 * media_url no banco pode ser: (1) string vazia; (2) URL única (legado); (3) JSON array de itens.
 */

export type NotificationMediaItem = {
  url: string;
  name: string;
  type: string;
  /** Chave no storage (MinIO); usado para remover ao desanexar. Não enviado no dispatch. */
  storage_key?: string;
};

const MEDIA_JSON_PREFIX = "[";

export function parseNotificationMediaUrl(mediaUrl: string | null | undefined): NotificationMediaItem[] {
  const raw = typeof mediaUrl === "string" ? mediaUrl.trim() : "";
  if (!raw) return [];
  if (raw.startsWith(MEDIA_JSON_PREFIX)) {
    try {
      const arr = JSON.parse(raw) as unknown;
      if (!Array.isArray(arr)) return [];
      return arr.filter(
        (x): x is NotificationMediaItem =>
          x && typeof x === "object" && typeof (x as NotificationMediaItem).url === "string"
      ).map((x) => ({
        url: String((x as NotificationMediaItem).url),
        name: String((x as NotificationMediaItem).name ?? ""),
        type: String((x as NotificationMediaItem).type ?? "application/octet-stream"),
        storage_key: typeof (x as NotificationMediaItem).storage_key === "string" ? (x as NotificationMediaItem).storage_key : undefined,
      }));
    } catch {
      return [];
    }
  }
  return [{ url: raw, name: "", type: "image" }];
}

export function serializeNotificationMedia(items: NotificationMediaItem[]): string {
  if (items.length === 0) return "";
  const toStore = items.map(({ url, name, type }) => ({ url, name, type }));
  if (toStore.length === 1 && !toStore[0].name && toStore[0].type === "image") {
    return toStore[0].url;
  }
  return JSON.stringify(toStore);
}

export function isImageType(mime: string, name: string): boolean {
  const n = name.toLowerCase();
  return /^image\//.test(mime) || /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(n);
}

export function isVideoType(mime: string, name: string): boolean {
  const n = name.toLowerCase();
  return /^video\//.test(mime) || /\.(mp4|webm|ogg|mov|avi)$/i.test(n);
}

export function isPdfType(mime: string, name: string): boolean {
  return mime === "application/pdf" || name.toLowerCase().endsWith(".pdf");
}

export const ACCEPT_MEDIA =
  "image/*,.pdf,.doc,.docx,.xls,.xlsx,video/*,application/pdf";

/** Retorna o primeiro item de mídia (para envio em um único canal, ex.: WhatsApp). */
export function getFirstMediaItem(mediaUrl: string | null | undefined): NotificationMediaItem | null {
  const items = parseNotificationMediaUrl(mediaUrl);
  return items.length > 0 ? items[0] : null;
}

/** Tipo de mídia para Evolution API: image | video | document (minúsculo) */
export function getEvolutionMediaType(item: NotificationMediaItem): "image" | "video" | "document" {
  if (isImageType(item.type, item.name)) return "image";
  if (isVideoType(item.type, item.name)) return "video";
  return "document";
}

/**
 * Normaliza o valor de media para envio na Evolution API.
 * URLs data: (base64) podem causar 400 em algumas versões; envia só o base64.
 * URLs http(s) são mantidas.
 */
export function normalizeMediaForEvolutionApi(mediaUrl: string): string {
  const s = mediaUrl.trim();
  const dataUrlMatch = /^data:[^;]+;base64,(.+)$/s.exec(s);
  if (dataUrlMatch) return dataUrlMatch[1].trim();
  return s;
}
