export const GRIDORA_PRIMARY_ADMIN_USER_ID = 1;
export const GRIDORA_PRIMARY_ADMIN_EMAIL = "sfchlimited@gmail.com";

export function isGridoraPrimaryAdmin(user: {
  id?: number | null;
  email?: string | null;
  role?: string | null;
} | null | undefined) {
  return (
    user?.role === "admin" &&
    user.id === GRIDORA_PRIMARY_ADMIN_USER_ID &&
    user.email?.trim().toLowerCase() === GRIDORA_PRIMARY_ADMIN_EMAIL
  );
}
