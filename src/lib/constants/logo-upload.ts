/**
 * Shared constants for sponsor/partnership logo uploads.
 * Keep server-side validation and client-side file picker rules aligned.
 */

export const LOGO_UPLOAD_ALLOWED_MIME_TYPES: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
];

export const LOGO_UPLOAD_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export const LOGO_UPLOAD_ACCEPT = LOGO_UPLOAD_ALLOWED_MIME_TYPES.join(',');
