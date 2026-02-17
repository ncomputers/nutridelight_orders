export type ActorRole = "admin" | "purchase" | "sales";

export const canPostAccounting = (role: ActorRole) => role === "admin" || role === "purchase";

export const canCloseDay = (role: ActorRole) => role === "admin";

export const canManageLedgerMapping = (role: ActorRole) => role === "admin";

export const canPostForUser = (role: ActorRole, actorUserId: string | null | undefined, targetUserId: string | null | undefined) => {
  if (role === "admin") return true;
  if (role === "purchase") return Boolean(actorUserId && targetUserId && actorUserId === targetUserId);
  return false;
};
