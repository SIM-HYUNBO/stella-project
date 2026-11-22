export const MAX_ALBUM_PHOTOS = 9;
export async function preparePhotoAlbum(files: File[]): Promise<string[]> {
  if (!files.length || files.length > MAX_ALBUM_PHOTOS) throw Error("사진은 한 번에 9장까지 선택해 줘.");
  const sources = await Promise.all(files.map(file => new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image(), url = URL.createObjectURL(file);
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(Error("사진을 읽지 못했어. 다른 사진으로 다시 골라 줘.")); };
    image.src = url;
  })));
  for (const size of [1000, 800, 600, 450, 320]) {
    const images = sources.map(image => {
      const scale = Math.min(size / image.width, size / image.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const ctx = canvas.getContext("2d"); if (!ctx) throw Error("사진을 준비하지 못했어.");
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/jpeg", .78);
    });
    // content repeats the first photo for existing notification/list readers.
    if (new TextEncoder().encode(JSON.stringify(images) + images[0]).length < 850_000) return images;
  }
  throw Error("사진 용량이 너무 커. 나눠서 보내 줘.");
}
