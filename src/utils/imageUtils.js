/**
 * Compress an uploaded image file to a JPEG DataURL so it fits comfortably in Firestore (< 400KB) and LocalStorage.
 */
export function compressImageToDataUrl(file, maxDimension = 900, quality = 0.72) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, WEBP).'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không thể đọc tệp hình ảnh.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Tệp hình ảnh bị lỗi hoặc không được hỗ trợ.'));
      img.onload = () => {
        const renderWith = (maxDim, q) => {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width >= height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reader.result;
          ctx.drawImage(img, 0, 0, width, height);
          return canvas.toDataURL('image/jpeg', q);
        };

        let compressed = renderWith(maxDimension, quality);
        if (compressed.length > 350000) {
          compressed = renderWith(720, 0.55);
        }
        if (compressed.length > 350000) {
          compressed = renderWith(560, 0.45);
        }
        resolve(compressed);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
