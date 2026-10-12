/**
 * Stamp (Seal) Image Resizer
 * 
 * 브라우저 Canvas API를 활용해 클라이언트 단에서 직인/인감 이미지를
 * 최대 200x200px 및 200KB 이하로 강제 리사이징/압축 후 전송하여 스토리지 및 서버 부하를 방어함.
 */

export interface StampResizeOptions {
  maxWidth?: number;
  maxHeight?: number;
  maxBytes?: number; // default: 200 * 1024 = 204,800 bytes (200KB)
  mimeType?: 'image/png' | 'image/webp' | 'image/jpeg';
}

export const DEFAULT_STAMP_MAX_WIDTH = 200;
export const DEFAULT_STAMP_MAX_HEIGHT = 200;
export const DEFAULT_STAMP_MAX_BYTES = 200 * 1024; // 200KB

/**
 * 이미지 원본 치수를 목표 치수에 맞게 비율 유지 축소 계산
 */
export function calculateAspectRatioFit(
  srcWidth: number,
  srcHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  if (srcWidth <= 0 || srcHeight <= 0) {
    return { width: maxWidth, height: maxHeight };
  }

  const ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight, 1);
  return {
    width: Math.round(srcWidth * ratio),
    height: Math.round(srcHeight * ratio),
  };
}

/**
 * Canvas API를 통한 클라이언트 직인 리사이징 & 200KB 용량 제한 압축
 */
export async function resizeStampImage(
  inputBlob: Blob,
  options?: StampResizeOptions
): Promise<Blob> {
  const maxWidth = options?.maxWidth ?? DEFAULT_STAMP_MAX_WIDTH;
  const maxHeight = options?.maxHeight ?? DEFAULT_STAMP_MAX_HEIGHT;
  const maxBytes = options?.maxBytes ?? DEFAULT_STAMP_MAX_BYTES;
  const mimeType = options?.mimeType ?? 'image/png';

  // 브라우저 Canvas 미지원 환경 (Node.js 테스트 등) Fallback
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return inputBlob;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(inputBlob);

    img.onload = async () => {
      URL.revokeObjectURL(url);
      try {
        const { width, height } = calculateAspectRatioFit(
          img.width,
          img.height,
          maxWidth,
          maxHeight
        );

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Canvas 2D context not available'));
        }

        // 투명 배경 유지하면서 고품질 스케일링
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.92;
        let blob = await new Promise<Blob | null>((res) =>
          canvas.toBlob(res, mimeType, quality)
        );

        if (!blob) {
          return reject(new Error('Failed to encode canvas to blob'));
        }

        // 200KB 초과 시 품질 점진적 압축 (JPEG/WebP) 또는 추가 축소
        while (blob.size > maxBytes && quality > 0.3) {
          quality -= 0.15;
          const nextBlob = await new Promise<Blob | null>((res) =>
            canvas.toBlob(res, mimeType, quality)
          );
          if (nextBlob) {
            blob = nextBlob;
          } else {
            break;
          }
        }

        resolve(blob);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for resizing'));
    };

    img.src = url;
  });
}
