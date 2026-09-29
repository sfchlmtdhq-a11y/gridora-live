export function formatPresence(
  isOnline: boolean,
  lastSeenAt: Date | string | null | undefined,
  locale?: string
): string {
  if (isOnline) return "Online";
  if (!lastSeenAt) return "Last seen unavailable";
  const date = new Date(lastSeenAt);
  if (!Number.isFinite(date.getTime())) return "Last seen unavailable";
  return `Last seen ${new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(date)}`;
}
