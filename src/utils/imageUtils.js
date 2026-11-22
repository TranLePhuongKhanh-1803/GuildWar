/**
 * Compress an uploaded image file to a DataURL so it fits comfortably in LocalStorage.
 */
export function compressImageToDataUrl(file, maxDimension = 1024, quality = 0.78) {
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
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
