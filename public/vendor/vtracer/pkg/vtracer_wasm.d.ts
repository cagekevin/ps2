/* tslint:disable */
/* eslint-disable */

/**
 * Vectorize encoded image bytes (PNG/JPEG/GIF/BMP). Returns the SVG string.
 */
export function vectorize_bytes(data: Uint8Array, options: any): string;

/**
 * Vectorize a raw RGBA8 buffer (`width * height * 4` bytes). Returns the SVG.
 */
export function vectorize_rgba(data: Uint8Array, width: number, height: number, options: any): string;
