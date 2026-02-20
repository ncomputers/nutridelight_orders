export interface CompressedImageResult {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  bytes: number;
}

export interface CompressImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  outputType?: "image/webp" | "image/jpeg" | "image/png";
}

const loadImage = (blob: Blob) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read image file."));
    };
    image.src = objectUrl;
  });

export const compressImageFile = async (
  file: File,
  options: CompressImageOptions = {},
): Promise<CompressedImageResult> => {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please select an image file.");
  }
  return compressImageBlob(file, options);
};

export const compressImageBlob = async (
  sourceBlob: Blob,
  options: CompressImageOptions = {},
): Promise<CompressedImageResult> => {
  if (!sourceBlob.type.startsWith("image/")) {
    throw new Error("Invalid image format.");
  }

  const {
    maxWidth = 192,
    maxHeight = 192,
    quality = 0.8,
    outputType = "image/webp",
  } = options;

  const image = await loadImage(sourceBlob);
  const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not process image.");
  }

  ctx.clearRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, 0, 0, width, height);

  const outputBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (nextBlob) => {
        if (!nextBlob) {
          reject(new Error("Could not compress image."));
          return;
        }
        resolve(nextBlob);
      },
      outputType,
      quality,
    );
  });

  const dataUrl = canvas.toDataURL(outputType, quality);
  return { blob: outputBlob, dataUrl, width, height, bytes: outputBlob.size };
};

export const compressImageUrl = async (
  url: string,
  options: CompressImageOptions = {},
): Promise<CompressedImageResult> => {
  const cleanUrl = url.trim();
  if (!/^https?:\/\//i.test(cleanUrl)) {
    throw new Error("Only http/https image URLs are supported.");
  }

  let response: Response;
  try {
    response = await fetch(cleanUrl);
  } catch {
    throw new Error("Could not fetch image URL.");
  }
  if (!response.ok) {
    throw new Error(`Image URL request failed (${response.status}).`);
  }
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.startsWith("image/")) {
    throw new Error("URL did not return an image.");
  }
  const blob = await response.blob();
  return compressImageBlob(blob, options);
};

export const compressImageDataUrl = async (
  dataUrl: string,
  options: CompressImageOptions = {},
): Promise<CompressedImageResult> => {
  const cleanValue = dataUrl.trim();
  if (!cleanValue.startsWith("data:image/")) {
    throw new Error("Invalid data image URL.");
  }
  let response: Response;
  try {
    response = await fetch(cleanValue);
  } catch {
    throw new Error("Could not read pasted data image.");
  }
  const blob = await response.blob();
  return compressImageBlob(blob, options);
};
