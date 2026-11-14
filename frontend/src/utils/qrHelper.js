import QRCode from 'qrcode';
import { getCustomerWebBaseUrl } from './apiConfig';

/**
 * Generates a high-quality data URL (data:image/png;base64,...) for a table QR code
 * completely client-side with 0 network latency, 0 CORS issues, and 100% reliability.
 */
export async function generateTableQrDataUrl(tableId, sessionToken, restaurantSlug) {
  const rSlug = restaurantSlug || 'tablemint';
  const restParam = `&restaurant=${encodeURIComponent(rSlug)}`;
  const baseUrl = getCustomerWebBaseUrl();
  const targetUrl = `${baseUrl}/?table=${tableId}&token=${sessionToken || ''}${restParam}`;

  try {
    const dataUrl = await QRCode.toDataURL(targetUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    });
    return dataUrl;
  } catch (err) {
    console.error('Failed to generate client-side QR data URL:', err);
    return null;
  }
}

/**
 * Returns the customer menu scan URL
 */
export function getTableScanUrl(tableId, sessionToken, restaurantSlug) {
  const rSlug = restaurantSlug || 'tablemint';
  const restParam = `&restaurant=${encodeURIComponent(rSlug)}`;
  const baseUrl = getCustomerWebBaseUrl();
  return `${baseUrl}/?table=${tableId}&token=${sessionToken || ''}${restParam}`;
}
