export async function compressImageFileToDataUrl(
  file: File,
  maxWidth = 960,
  maxHeight = 960,
  quality = 0.78,
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please select a valid image file.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the selected image.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image format.'));
      img.onload = () => {
        let { width, height } = img;
        const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
        width = Math.max(1, Math.round(width * ratio));
        height = Math.max(1, Math.round(height * ratio));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable.'));
          return;
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        let currentQuality = quality;
        let dataUrl = canvas.toDataURL('image/jpeg', currentQuality);
        while (dataUrl.length > 700000 && currentQuality > 0.25) {
          currentQuality -= 0.15;
          dataUrl = canvas.toDataURL('image/jpeg', Math.max(0.2, currentQuality));
        }
        if (dataUrl.length > 700000) {
          const smallCanvas = document.createElement('canvas');
          smallCanvas.width = Math.max(1, Math.round(width * 0.6));
          smallCanvas.height = Math.max(1, Math.round(height * 0.6));
          const sctx = smallCanvas.getContext('2d');
          if (sctx) {
            sctx.fillStyle = '#FFFFFF';
            sctx.fillRect(0, 0, smallCanvas.width, smallCanvas.height);
            sctx.drawImage(canvas, 0, 0, smallCanvas.width, smallCanvas.height);
            dataUrl = smallCanvas.toDataURL('image/jpeg', 0.45);
          }
        }
        resolve(dataUrl);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
