import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function newTotpSecret(): string {
  const bytes = randomBytes(20);
  let bits = '';
  for (const byte of bytes) bits += byte.toString(2).padStart(8, '0');
  let result = '';
  for (let index = 0; index < bits.length; index += 5) result += alphabet[parseInt(bits.slice(index, index + 5).padEnd(5, '0'), 2)];
  return result;
}

function decode(secret: string): Buffer {
  let bits = '';
  for (const character of secret) {
    const value = alphabet.indexOf(character);
    if (value < 0) return Buffer.alloc(0);
    bits += value.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) bytes.push(parseInt(bits.slice(index, index + 8), 2));
  return Buffer.from(bytes);
}

function codeAt(secret: string, step: number): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const digest = createHmac('sha1', decode(secret)).update(counter).digest();
  const offset = digest[digest.length - 1] & 15;
  const value = (digest.readUInt32BE(offset) & 0x7fffffff) % 1000000;
  return value.toString().padStart(6, '0');
}

export function verifyTotp(secret: string, code: string): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  const now = Math.floor(Date.now() / 30000);
  for (const offset of [-1, 0, 1]) {
    const expected = Buffer.from(codeAt(secret, now + offset));
    if (timingSafeEqual(expected, Buffer.from(code))) return true;
  }
  return false;
}
