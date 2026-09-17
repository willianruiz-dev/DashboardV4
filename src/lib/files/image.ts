export interface ImageBytes {
  extension: string;
  values: number[];
}

export async function imageFileToBytes(file: File): Promise<ImageBytes> {
  if (!file.type.startsWith("image/")) {
    throw new Error("El archivo debe ser una imagen.");
  }

  const extension = file.name.split(".").pop()?.trim().toLowerCase();
  if (!extension) {
    throw new Error("La imagen debe tener una extensión de archivo.");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  return {
    extension,
    values: Array.from(bytes),
  };
}
