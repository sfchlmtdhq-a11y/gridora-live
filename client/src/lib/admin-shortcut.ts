export const ADMIN_SHORTCUT_TAPS = 29;

export function advanceAdminShortcutTap(currentTapCount: number) {
  const nextCount = Math.max(0, Math.floor(currentTapCount)) + 1;
  const openAdmin = nextCount >= ADMIN_SHORTCUT_TAPS;
  return {
    tapCount: openAdmin ? 0 : nextCount,
    openAdmin,
  };
}
