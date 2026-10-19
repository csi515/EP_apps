export const DESKTOP_MIN_WIDTH = 1024;

export function isDesktopViewport(width: number): boolean {
  return width >= DESKTOP_MIN_WIDTH;
}
