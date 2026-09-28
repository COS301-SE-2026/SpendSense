export function createIdempotencyKey(): string {
  return crypto.randomUUID()
}