/**
 * Utility functions for Google Drive URLs
 */

/**
 * Extract file ID from a Google Drive URL
 * Supports multiple Google Drive URL formats:
 * - https://drive.google.com/uc?export=view&id=FILE_ID
 * - https://drive.google.com/file/d/FILE_ID/view
 * - https://drive.google.com/open?id=FILE_ID
 * - FILE_ID (if already just an ID)
 */
export function extractFileId(url: string): string | null {
  if (!url) return null;

  // If it's already just an ID (no URL structure)
  if (!url.includes('http') && !url.includes('/')) {
    return url;
  }

  // Extract from uc?export=view&id= format
  const ucMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (ucMatch) {
    return ucMatch[1];
  }

  // Extract from /file/d/FILE_ID/ format
  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) {
    return fileMatch[1];
  }

  // Extract from /open?id= format
  const openMatch = url.match(/\/open\?id=([a-zA-Z0-9_-]+)/);
  if (openMatch) {
    return openMatch[1];
  }

  // Extract from lh3.googleusercontent.com/d/FILE_ID= format
  const lh3Match = url.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
  if (lh3Match) {
    return lh3Match[1];
  }

  // If it looks like a direct file ID (alphanumeric with dashes/underscores)
  const directIdMatch = url.match(/^([a-zA-Z0-9_-]{20,})$/);
  if (directIdMatch) {
    return directIdMatch[1];
  }

  return null;
}

/**
 * Convert a Google Drive URL to a thumbnail URL
 * @param url - The Google Drive URL or file ID
 * @param width - Thumbnail width (default: 400)
 * @param height - Thumbnail height (default: 400)
 * @returns Thumbnail URL or original URL if conversion fails
 */
export function getThumbnailUrl(url: string | null | undefined, width: number = 400, height: number = 400, fallbackFileId?: string): string | null {
  if (!url && !fallbackFileId) return null;

  const fileId = extractFileId(url || '') || fallbackFileId;
  if (!fileId) {
    // If we can't extract the file ID, return the original URL
    return url || null;
  }

  // Explicitly check for data URLs (base64 images)
  if (url && url.startsWith('data:')) {
    return url;
  }

  // Try to preserve session info only if it's already a stable lh3 link
  // DO NOT preserve drive-storage or drive-viewer links as they expire
  if (url && url.includes('lh3.googleusercontent.com') && !url.includes('drive-storage') && !url.includes('drive-viewer')) {
    if (url.includes('/d/')) {
        return url.replace(/=s\d+$/, `=s${width}`);
    }
  }

  // Use Google Drive thumbnail API (lh3 format is reliably stable with the file ID)
  // Format: https://lh3.googleusercontent.com/d/FILE_ID=s{size}
  return `https://lh3.googleusercontent.com/d/${fileId}=s${width}`;
}

/**
 * Get a small thumbnail URL (for profile pictures, avatars, etc.)
 */
export function getSmallThumbnailUrl(url: string | null | undefined, fallbackFileId?: string): string | null {
  return getThumbnailUrl(url, 200, 200, fallbackFileId);
}

/**
 * Get a medium thumbnail URL
 */
export function getMediumThumbnailUrl(url: string | null | undefined, fallbackFileId?: string): string | null {
  return getThumbnailUrl(url, 400, 400, fallbackFileId);
}

/**
 * Get a large thumbnail URL
 */
export function getLargeThumbnailUrl(url: string | null | undefined, fallbackFileId?: string): string | null {
  return getThumbnailUrl(url, 800, 800, fallbackFileId);
}
