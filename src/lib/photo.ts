// Turning a picture someone picks into an avatar: cropped to the middle square
// and shrunk to a small JPEG (about 3 KB), so it can travel to friends.
export const PHOTO_SIZE = 96;

export async function photoFromFile(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    if (!side) throw new Error('That picture is empty');
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = PHOTO_SIZE;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, PHOTO_SIZE, PHOTO_SIZE);
    // Step the quality down until it's small enough to send.
    for (const q of [0.85, 0.75, 0.6, 0.45]) {
      const data = canvas.toDataURL('image/jpeg', q);
      if (data.length <= 12_000) return data;
    }
    return canvas.toDataURL('image/jpeg', 0.3);
  } finally {
    URL.revokeObjectURL(url);
  }
}
