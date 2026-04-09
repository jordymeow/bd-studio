/** Safe to import from both server and client code (no node deps). */
export function generateId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}
