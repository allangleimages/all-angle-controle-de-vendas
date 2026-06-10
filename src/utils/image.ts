/**
 * Utility to compress an image Base64 string using Canvas API.
 * Resizes the image to fit within maxWidth and maxHeight (retaining aspect ratio)
 * and compresses it to a lightweight JPEG format under a given quality.
 */
export function compressImageBase64(
  base64Str: string,
  maxWidth = 180,
  maxHeight = 180,
  quality = 0.7
): Promise<string> {
  return new Promise((resolve) => {
    // If it's not a data URL, return it
    if (!base64Str || !base64Str.startsWith('data:image/')) {
      resolve(base64Str || '');
      return;
    }

    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions while keeping ratio
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Fill white background for transparent images
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        // Convert to high-performance lightweight JPEG
        resolve(canvas.toDataURL('image/jpeg', quality));
      } else {
        resolve(base64Str);
      }
    };
    img.onerror = () => {
      resolve(base64Str);
    };
  });
}
