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
export function getThumbnailUrl(url: string | null | undefined, width: number = 400, height: number = 400): string | null {
  if (!url) return null;
  
  const fileId = extractFileId(url);
  if (!fileId) {
    // If we can't extract the file ID, return the original URL
    return url;
  }
  
  // Use Google Drive thumbnail API
  // Format: https://drive.google.com/thumbnail?id=FILE_ID&sz=w{width}-h{height}
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${width}-h${height}`;
}

/**
 * Get a small thumbnail URL (for profile pictures, avatars, etc.)
 */
export function getSmallThumbnailUrl(url: string | null | undefined): string | null {
  return getThumbnailUrl(url, 200, 200);
}

/**
 * Get a medium thumbnail URL
 */
export function getMediumThumbnailUrl(url: string | null | undefined): string | null {
  return getThumbnailUrl(url, 400, 400);
}

/**
 * Get a large thumbnail URL
 */
export function getLargeThumbnailUrl(url: string | null | undefined): string | null {
  return getThumbnailUrl(url, 800, 800);
}
