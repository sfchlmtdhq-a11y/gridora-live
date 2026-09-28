export function formatLastSeen(
  value: Date | string | null | undefined,
  now = Date.now()
): string {
  if (!value) return "Last seen unavailable";
  const timestamp = value instanceof Date ? value.getTime() : new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "Last seen unavailable";

  const elapsed = Math.max(0, now - timestamp);
  if (elapsed < 60_000) return "Last seen just now";
  if (elapsed < 60 * 60_000)
    return `Last seen ${Math.floor(elapsed / 60_000)}m ago`;
  if (elapsed < 24 * 60 * 60_000)
    return `Last seen ${Math.floor(elapsed / (60 * 60_000))}h ago`;

  const date = new Date(timestamp);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString())
    return `Last seen yesterday, ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  return `Last seen ${date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() !== new Date(now).getFullYear() ? { year: "numeric" } : {}),
  })}`;
}

export function contactRatingStars(
  onboardingRating: boolean,
  rating: number | string | null | undefined
): number {
  if (onboardingRating) return 5;
  const score = Number(rating || 0);
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(5, Math.round(score / 10)));
}

export function isConnectedContact(connectionStatus: string): boolean {
  return connectionStatus === "connected";
}

export type ContactSort = "connections" | "name-asc" | "name-desc" | "rating";

export type SortableContact = {
  name?: string | null;
  rating?: number | string | null;
  connectionStatus?: string;
  isHidden?: boolean;
};

export function sortContacts<T extends SortableContact>(
  contacts: readonly T[],
  sortBy: ContactSort
): T[] {
  const connectionRank = (status?: string) =>
    status === "connected" ? 0 : status === "accept" || status === "request_sent" ? 1 : 2;
  const alphabetical = (a: T, b: T) =>
    (a.name || "").localeCompare(b.name || "", undefined, {
      sensitivity: "base",
    });

  return [...contacts].sort((a, b) => {
    if (Boolean(a.isHidden) !== Boolean(b.isHidden))
      return Number(Boolean(a.isHidden)) - Number(Boolean(b.isHidden));
    if (sortBy === "name-asc") return alphabetical(a, b);
    if (sortBy === "name-desc") return alphabetical(b, a);
    if (sortBy === "rating") {
      const score = Number(b.rating || 0) - Number(a.rating || 0);
      return score || alphabetical(a, b);
    }
    return connectionRank(a.connectionStatus) - connectionRank(b.connectionStatus) || alphabetical(a, b);
  });
}
