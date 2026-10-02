/**
 * QR Code Generator Utility
 * Generates dynamic QR codes for books with signed tokens
 * Supports PNG/SVG output, caching, and token rotation
 */

const QRCode = require('qrcode');
const crypto = require('crypto');

const QR_SECRET = process.env.QR_SECRET || process.env.JWT_SECRET || 'elvora-qr-secret';
const APP_URL = process.env.APP_URL || 'http://localhost:5173';

/**
 * Generate a unique QR token for a book
 * Format: elvqr_<random>_<signature>
 */
function generateQRToken() {
    const random = crypto.randomBytes(12).toString('hex');
    const timestamp = Date.now().toString(36);
    const payload = `${random}_${timestamp}`;
    const signature = crypto
        .createHmac('sha256', QR_SECRET)
        .update(payload)
        .digest('hex')
        .substring(0, 8);
    return `elvqr_${payload}_${signature}`;
}

/**
 * Verify a QR token's signature
 */
function verifyQRToken(token) {
    if (!token || !token.startsWith('elvqr_')) return false;
    const parts = token.replace('elvqr_', '').split('_');
    if (parts.length < 3) return false;

    const signature = parts.pop();
    const payload = parts.join('_');
    const expectedSig = crypto
        .createHmac('sha256', QR_SECRET)
        .update(payload)
        .digest('hex')
        .substring(0, 8);

    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSig)
    );
}

/**
 * Build the URL that the QR code encodes
 */
function buildBookURL(qrToken) {
    return `${APP_URL}/books/${qrToken}`;
}

/**
 * Build a short-link fallback URL
 */
function buildShortLink(qrToken) {
    return `${APP_URL}/b/${qrToken.substring(6, 18)}`;
}

/**
 * Build public barcode-based URL for QR codes (Google Lens flow)
 * Format: http://<local-ip>:5173/book/<barcode>
 */
function buildBarcodeURL(barcode) {
    return `${APP_URL}/book/${barcode}`;
}

/**
 * Generate a QR code as a PNG data URL
 */
async function generateQRCodeDataURL(text, options = {}) {
    const defaults = {
        type: 'image/png',
        width: options.width || 300,
        margin: 2,
        color: {
            dark: '#1a1a2e',
            light: '#ffffff'
        },
        errorCorrectionLevel: 'M'
    };

    return QRCode.toDataURL(text, { ...defaults, ...options });
}

/**
 * Generate a QR code as SVG string
 */
async function generateQRCodeSVG(text, options = {}) {
    const defaults = {
        type: 'svg',
        width: options.width || 300,
        margin: 2,
        color: {
            dark: '#1a1a2e',
            light: '#ffffff'
        },
        errorCorrectionLevel: 'M'
    };
    return QRCode.toString(text, { ...defaults, ...options });
}

/**
 * Generate QR code as a PNG buffer
 */
async function generateQRCodeBuffer(text, options = {}) {
    const defaults = {
        type: 'png',
        width: options.width || 400,
        margin: 2,
        color: {
            dark: '#1a1a2e',
            light: '#ffffff'
        },
        errorCorrectionLevel: 'M'
    };
    return QRCode.toBuffer(text, { ...defaults, ...options });
}

module.exports = {
    generateQRToken,
    verifyQRToken,
    buildBookURL,
    buildShortLink,
    buildBarcodeURL,
    generateQRCodeDataURL,
    generateQRCodeSVG,
    generateQRCodeBuffer
};
