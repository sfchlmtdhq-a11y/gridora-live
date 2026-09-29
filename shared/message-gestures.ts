export type MessageTapAction = "reaction" | "edit" | "delete" | null;

export const MESSAGE_TAP_BURST_MS = 900;
export const MESSAGE_SWIPE_THRESHOLD_PX = 56;

export function messageTapAction(tapCount: number, canEdit: boolean): MessageTapAction {
  if (tapCount >= 4) return "delete";
  if (tapCount === 3) return canEdit ? "edit" : null;
  if (tapCount === 1) return "reaction";
  return null;
}

export function isReplySwipe(deltaX: number, deltaY: number): boolean {
  return (
    Math.abs(deltaX) >= MESSAGE_SWIPE_THRESHOLD_PX &&
    Math.abs(deltaX) > Math.abs(deltaY) * 1.25
  );
}
