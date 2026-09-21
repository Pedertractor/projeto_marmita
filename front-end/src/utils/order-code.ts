const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Código curto amigável (6 chars) para exibir como #K7M2P9. */
export function generateOrderCode(length = 6): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let code = '';
  for (let i = 0; i < length; i++) {
    code += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return code;
}
