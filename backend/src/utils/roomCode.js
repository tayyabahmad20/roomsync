/**
 * Generates a short, human-friendly room code.
 * Example: RS-4K7P9D
 */
export function generateRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // avoid ambiguous chars
  const chunk = (len) =>
    Array.from({ length: len }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");

  return `RS-${chunk(6)}`;
}
