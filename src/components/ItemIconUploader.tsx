import { useRef, useState, type ChangeEvent, type ClipboardEvent } from "react";
import { compressImageBlob, compressImageDataUrl, compressImageFile, compressImageUrl } from "@/lib/imageCompression";

interface ItemIconUploaderProps {
  itemLabel: string;
  disabled?: boolean;
  onUploaded: (payload: { dataUrl: string; bytes: number; width: number; height: number }) => Promise<void> | void;
}

const ICON_OPTIONS = {
  maxWidth: 192,
  maxHeight: 192,
  quality: 0.8,
  outputType: "image/webp" as const,
};

const isHttpUrl = (value: string) => /^https?:\/\//i.test(value.trim());
const isDataImageUrl = (value: string) => value.trim().startsWith("data:image/");

const extractImgSrcFromHtml = (html: string) => {
  const srcMatch = html.match(/<img[^>]*src=["']([^"']+)["']/i);
  return srcMatch?.[1]?.trim() || "";
};

const getErrorMessage = (err: unknown) => {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object") {
    const maybe = err as { message?: string; error_description?: string; details?: string; hint?: string };
    return maybe.message || maybe.error_description || maybe.details || maybe.hint || "Could not process image.";
  }
  return "Could not process image.";
};

const ItemIconUploader = ({ itemLabel, disabled = false, onUploaded }: ItemIconUploaderProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [urlValue, setUrlValue] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const pasteRef = useRef<HTMLTextAreaElement | null>(null);

  const uploadCompressed = async (data: {
    dataUrl: string;
    bytes: number;
    width: number;
    height: number;
  }) => {
    await onUploaded(data);
  };

  const processFile = async (file: File) => {
    const compressed = await compressImageFile(file, ICON_OPTIONS);
    await uploadCompressed(compressed);
  };

  const processUrl = async (url: string) => {
    const compressed = await compressImageUrl(url, ICON_OPTIONS);
    await uploadCompressed(compressed);
  };

  const processDataUrl = async (dataUrl: string) => {
    const compressed = await compressImageDataUrl(dataUrl, ICON_OPTIONS);
    await uploadCompressed(compressed);
  };

  const processClipboardItems = async (items: DataTransferItemList, text?: string, html?: string, files?: FileList) => {
    if (files && files.length > 0 && files[0].type.startsWith("image/")) {
      await processFile(files[0]);
      return;
    }

    const imageItem = Array.from(items || []).find((item) => item.type.startsWith("image/"));
    if (imageItem) {
      const file = imageItem.getAsFile();
      if (!file) throw new Error("Could not read clipboard image.");
      await processFile(file);
      return;
    }

    const clipboardText = (text ?? "").trim();
    if (isHttpUrl(clipboardText)) {
      setUrlValue(clipboardText);
      await processUrl(clipboardText);
      return;
    }
    if (isDataImageUrl(clipboardText)) {
      await processDataUrl(clipboardText);
      return;
    }

    const imageSrcFromHtml = extractImgSrcFromHtml(html ?? "");
    if (isHttpUrl(imageSrcFromHtml)) {
      setUrlValue(imageSrcFromHtml);
      await processUrl(imageSrcFromHtml);
      return;
    }
    if (isDataImageUrl(imageSrcFromHtml)) {
      await processDataUrl(imageSrcFromHtml);
      return;
    }

    if (navigator.clipboard?.read) {
      const clipboardItems = await navigator.clipboard.read();
      for (const clipboardItem of clipboardItems) {
        const imageType = clipboardItem.types.find((type) => type.startsWith("image/"));
        if (!imageType) continue;
        const blob = await clipboardItem.getType(imageType);
        const compressed = await compressImageBlob(blob, ICON_OPTIONS);
        await uploadCompressed(compressed);
        return;
      }
    }

    if (navigator.clipboard?.readText) {
      const clipboardText = (await navigator.clipboard.readText()).trim();
      if (isHttpUrl(clipboardText)) {
        setUrlValue(clipboardText);
        await processUrl(clipboardText);
        return;
      }
      if (isDataImageUrl(clipboardText)) {
        await processDataUrl(clipboardText);
        return;
      }
    }

    throw new Error("Clipboard has no image or valid image URL.");
  };

  const runProcess = async (runner: () => Promise<void>) => {
    setError("");
    setIsProcessing(true);
    try {
      await runner();
    } catch (err) {
      const nextError = getErrorMessage(err);
      setError(nextError);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    await runProcess(async () => {
      await processFile(file);
    });
  };

  const handleUseUrl = async () => {
    if (!isHttpUrl(urlValue)) {
      setError("Enter a valid image URL (http/https).");
      return;
    }
    await runProcess(async () => {
      await processUrl(urlValue.trim());
    });
  };

  const handlePaste = async (event: ClipboardEvent<HTMLElement>) => {
    if (disabled || isProcessing) return;
    event.preventDefault();
    await runProcess(async () => {
      await processClipboardItems(
        event.clipboardData.items,
        event.clipboardData.getData("text/plain"),
        event.clipboardData.getData("text/html"),
        event.clipboardData.files,
      );
    });
  };

  const handleClipboardRead = async () => {
    if (!navigator.clipboard?.read) {
      setError("Clipboard read is not supported in this browser.");
      return;
    }
    await runProcess(async () => {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const imageType = item.types.find((type) => type.startsWith("image/"));
        if (!imageType) continue;
        const blob = await item.getType(imageType);
        const compressed = await compressImageBlob(blob, ICON_OPTIONS);
        await uploadCompressed(compressed);
        return;
      }
      throw new Error("No image found in clipboard.");
    });
  };

  return (
    <div className="w-[250px] rounded-md border border-border/70 bg-background p-2">
      <div className="flex items-center gap-2 mb-2">
        <button
          type="button"
          disabled={disabled || isProcessing}
          onClick={() => inputRef.current?.click()}
          className="h-8 px-2 rounded-md border border-border text-xs hover:bg-accent transition-colors disabled:opacity-60"
        >
          Upload
        </button>
        <button
          type="button"
          disabled={disabled || isProcessing}
          onClick={() => pasteRef.current?.focus()}
          className="h-8 px-2 rounded-md border border-border text-xs hover:bg-accent transition-colors disabled:opacity-60"
        >
          Paste Here
        </button>
        <button
          type="button"
          disabled={disabled || isProcessing}
          onClick={handleClipboardRead}
          className="h-8 px-2 rounded-md border border-border text-xs hover:bg-accent transition-colors disabled:opacity-60"
          title="Read image from clipboard"
        >
          Read Clipboard
        </button>
      </div>

      <div
        onPaste={handlePaste}
        className="mb-2 rounded-md border border-dashed border-border p-1.5"
      >
        <textarea
          ref={pasteRef}
          onPaste={handlePaste}
          placeholder="Copy image anywhere, click here, press Ctrl+V"
          className="h-12 w-full resize-none rounded-md border border-border bg-background px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-ring"
          disabled={disabled || isProcessing}
        />
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || isProcessing}
      />

      <div className="flex items-center gap-1">
        <input
          value={urlValue}
          onChange={(event) => setUrlValue(event.target.value)}
          placeholder="https://image-url..."
          className="h-8 flex-1 rounded-md border border-border bg-background px-2 text-[11px] focus:outline-none focus:ring-1 focus:ring-ring"
          disabled={disabled || isProcessing}
        />
        <button
          type="button"
          disabled={disabled || isProcessing}
          onClick={handleUseUrl}
          className="h-8 px-2 rounded-md border border-border text-xs hover:bg-accent transition-colors disabled:opacity-60"
        >
          Use URL
        </button>
      </div>

      <p className="mt-1 text-[10px] text-muted-foreground">Auto-process: 192px WebP compressed</p>
      {isProcessing && <p className="text-[10px] text-muted-foreground mt-1">Processing icon...</p>}
      {error && <p className="text-[10px] text-destructive mt-1">{itemLabel}: {error}</p>}
    </div>
  );
};

export default ItemIconUploader;
