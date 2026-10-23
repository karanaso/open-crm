export function sortByOccurredAtDesc<T extends { occurredAt: Date }>(items: T[]) {
  return [...items].sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
}
