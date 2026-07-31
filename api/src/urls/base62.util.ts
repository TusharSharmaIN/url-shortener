const ALPHABET =
  '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function toBase62(num: number): string {
  if (num === 0) return ALPHABET[0];
  let result = '';
  while (num > 0) {
    result = ALPHABET[num % 62] + result;
    num = Math.floor(num / 62);
  }
  return result;
}
