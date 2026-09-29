export const MESSAGE_NOTIFICATION_WINDOW_MS = 5 * 60 * 1000;

export function shouldNotifyMessageBurst(
  recentMessageCount: number,
  alreadyNotifiedForBurst: boolean
): boolean {
  return recentMessageCount > 2 && !alreadyNotifiedForBurst;
}
