import { useRef } from "react";
import { Upload, X, FileText, Image, FileSpreadsheet, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  type NotificationMediaItem,
  parseNotificationMediaUrl,
  isImageType,
  isVideoType,
  isPdfType,
  ACCEPT_MEDIA,
} from "@/lib/notificationMedia";
import { useToast } from "@/hooks/use-toast";
import { storageProvider } from "@/lib/storage/storageProvider";

type NotificationMediaFieldProps = {
  mediaUrl: string;
  onMediaChange: (items: NotificationMediaItem[]) => void;
  /** Chamado quando o usuário anexa ou cola arquivos; o pai faz upload e depois chama onMediaChange. */
  onAddFiles: (files: File[]) => Promise<void>;
  readOnly?: boolean;
  disabled?: boolean;
};

export function NotificationMediaField({
  mediaUrl,
  onMediaChange,
  onAddFiles,
  readOnly = false,
  disabled = false,
}: NotificationMediaFieldProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const items = parseNotificationMediaUrl(mediaUrl);

  const handleFiles = async (files: FileList | File[]) => {
    const list = Array.isArray(files) ? files : Array.from(files);
    if (!list.length) return;
    const allowed = list.filter((f) => {
      const ok =
        f.type.startsWith("image/") ||
        f.type === "application/pdf" ||
        /\.(doc|docx|xls|xlsx)$/i.test(f.name) ||
        f.type.startsWith("video/");
      return ok;
    });
    if (allowed.length !== list.length) {
      toast({
        title: "Alguns arquivos foram ignorados",
        description: "Use apenas imagem, PDF, Word, Excel ou vídeo.",
        variant: "destructive",
      });
    }
    if (allowed.length) await onAddFiles(allowed);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files;
    if (f?.length) {
      handleFiles(f);
      e.target.value = "";
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (readOnly || disabled) return;
    const f = e.clipboardData?.files;
    if (f?.length) {
      e.preventDefault();
      handleFiles(f);
    }
  };

  const handleRemove = async (index: number) => {
    const item = items[index];
    if (item.storage_key && !item.url.startsWith("data:")) {
      try {
        await storageProvider.remove(item.storage_key);
      } catch {
        // continua e remove da lista
      }
    }
    const next = items.filter((_, i) => i !== index);
    onMediaChange(next);
  };

  const iconFor = (item: NotificationMediaItem) => {
    if (isImageType(item.type, item.name)) return Image;
    if (isVideoType(item.type, item.name)) return Video;
    if (isPdfType(item.type, item.name)) return FileText;
    if (/\.(xls|xlsx|doc|docx)$/i.test(item.name)) return FileSpreadsheet;
    return FileText;
  };

  const Thumbnail = ({ item, idx }: { item: NotificationMediaItem; idx: number }) => {
    const Icon = iconFor(item);
    const isImage = isImageType(item.type, item.name);
    const isVideo = isVideoType(item.type, item.name);
    const isPdf = isPdfType(item.type, item.name);
    return (
      <div className="relative rounded border bg-muted/30 overflow-hidden group w-14 h-14 flex-shrink-0">
        <div className="w-full h-full flex items-center justify-center bg-muted/50 overflow-hidden">
          {isImage && (item.url.startsWith("data:") || item.url.startsWith("http")) ? (
            <img
              src={item.url}
              alt={item.name || "Anexo"}
              className="w-full h-full object-cover"
            />
          ) : isVideo ? (
            <video
              src={item.url}
              className="w-full h-full object-cover"
              muted
              preload="metadata"
            />
          ) : (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-1 text-muted-foreground hover:text-foreground"
            >
              <Icon className="w-5 h-5 shrink-0" />
            </a>
          )}
        </div>
        {!readOnly && !disabled && (
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full opacity-90 group-hover:opacity-100"
            onClick={() => handleRemove(idx)}
          >
            <X className="w-2.5 h-2.5" />
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">Mídia (opcional)</Label>
      <div
        className="flex flex-wrap items-center gap-2"
        onPaste={!readOnly && !disabled ? handlePaste : undefined}
      >
        {!readOnly && !disabled && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              accept={ACCEPT_MEDIA}
              onChange={handleInputChange}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-2.5 text-xs"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              Anexar
            </Button>
          </>
        )}
        {items.map((item, idx) => (
          <Thumbnail key={`${item.url}-${idx}`} item={item} idx={idx} />
        ))}
      </div>
      {!readOnly && !disabled && (
        <p className="text-[11px] text-muted-foreground">
          Imagem, PDF, Word, Excel ou vídeo. Ou cole (Ctrl+V) no campo de texto.
        </p>
      )}
    </div>
  );
}
