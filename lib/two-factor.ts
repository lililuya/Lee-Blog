import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const TOTP_PERIOD_SECONDS = 30;
const TOTP_DIGITS = 6;
const TOTP_WINDOW = 1;

export const TWO_FACTOR_CHALLENGE_COOKIE_NAME = "scholar_blog_2fa";
export const TWO_FACTOR_CHALLENGE_TTL_MS = 10 * 60 * 1000;

function normalizeBase32(value: string) {
  return value.toUpperCase().replace(/[^A-Z2-7]/g, "");
}

function bufferToBase32(buffer: Buffer) {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

function base32ToBuffer(value: string) {
  const normalized = normalizeBase32(value);
  let bits = 0;
  let carry = 0;
  const bytes: number[] = [];

  for (const character of normalized) {
    const index = BASE32_ALPHABET.indexOf(character);

    if (index < 0) {
      continue;
    }

    carry = (carry << 5) | index;
    bits += 5;

    if (bits >= 8) {
      bytes.push((carry >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

function formatCounter(counter: number) {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  return buffer;
}

function generateHotp(secret: string, counter: number) {
  const hmac = createHmac("sha1", base32ToBuffer(secret))
    .update(formatCounter(counter))
    .digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return String(binary % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, "0");
}

export function normalizeTwoFactorToken(value: string) {
  return value.replace(/[\s-]+/g, "").trim().toUpperCase();
}

export function formatTwoFactorSecret(value: string) {
  return normalizeBase32(value).replace(/(.{4})/g, "$1 ").trim();
}

export function generateTwoFactorSecret() {
  return bufferToBase32(randomBytes(20));
}

export function buildTwoFactorOtpauthUri(input: {
  issuer: string;
  email: string;
  secret: string;
}) {
  const issuer = input.issuer.trim() || "Scholar Blog";
  const label = `${issuer}:${input.email.trim().toLowerCase()}`;

  return `otpauth://totp/${encodeURIComponent(label)}?secret=${encodeURIComponent(
    normalizeBase32(input.secret),
  )}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD_SECONDS}`;
}

export function verifyTwoFactorToken(secret: string, token: string) {
  const normalizedToken = normalizeTwoFactorToken(token);

  if (!/^\d{6}$/.test(normalizedToken)) {
    return false;
  }

  const timeStep = Math.floor(Date.now() / 1000 / TOTP_PERIOD_SECONDS);

  for (let offset = -TOTP_WINDOW; offset <= TOTP_WINDOW; offset += 1) {
    const candidate = generateHotp(secret, timeStep + offset);

    if (
      candidate.length === normalizedToken.length &&
      timingSafeEqual(Buffer.from(candidate), Buffer.from(normalizedToken))
    ) {
      return true;
    }
  }

  return false;
}

export function createTwoFactorChallengeToken() {
  return randomBytes(32).toString("hex");
}

export function hashTwoFactorChallengeToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
