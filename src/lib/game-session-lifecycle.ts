import { prisma } from "@/lib/prisma";

/** Started matches with no result past this age become `incompleteAt` (host sees a warning; new games allowed). */
export const ACTIVE_MATCH_WINDOW_MS = 60 * 60 * 1000;
/** Open lobbies (not started) past this age auto-close so they stop blocking new lobbies. */
export const OPEN_LOBBY_WINDOW_MS = 60 * 60 * 1000;

/**
 * Marks started, unclosed sessions older than {@link ACTIVE_MATCH_WINDOW_MS} as incomplete.
 * Call from request handlers / pages before reading active-session state.
 */
export async function markStaleSessionsIncompleteNow(): Promise<void> {
  const cutoff = new Date(Date.now() - ACTIVE_MATCH_WINDOW_MS);
  await prisma.gameSession.updateMany({
    where: {
      startedAt: { not: null, lt: cutoff },
      closedAt: null,
      incompleteAt: null,
    },
    data: { incompleteAt: new Date() },
  });
}

/**
 * Auto-closes host lobbies that were never started and are older than {@link OPEN_LOBBY_WINDOW_MS}.
 * This keeps abandoned lobbies from blocking "New game".
 */
export async function closeStaleOpenLobbiesNow(userId?: string): Promise<void> {
  const cutoff = new Date(Date.now() - OPEN_LOBBY_WINDOW_MS);
  await prisma.gameSession.updateMany({
    where: {
      ...(userId ? { playerOneId: userId } : {}),
      startedAt: null,
      closedAt: null,
      createdAt: { lt: cutoff },
    },
    data: { closedAt: new Date() },
  });
}

export type LiveActiveSessionRow = {
  id: string;
  startedAt: Date;
  playerOne: { displayName: string };
  playerTwo: { displayName: string } | null;
};

/**
 * A "live" match: clock started, not closed, not yet auto-marked incomplete.
 */
export async function findLiveActiveSessionForUser(
  userId: string,
): Promise<LiveActiveSessionRow | null> {
  const row = await prisma.gameSession.findFirst({
    where: {
      closedAt: null,
      incompleteAt: null,
      startedAt: { not: null },
      OR: [{ playerOneId: userId }, { playerTwoId: userId }],
    },
    select: {
      id: true,
      startedAt: true,
      playerOne: { select: { displayName: true } },
      playerTwo: { select: { displayName: true } },
    },
  });
  if (!row?.startedAt || !row.playerTwo) {
    return null;
  }
  return row as LiveActiveSessionRow;
}

export async function findOpenHostLobby(userId: string): Promise<{ id: string } | null> {
  return prisma.gameSession.findFirst({
    where: {
      playerOneId: userId,
      startedAt: null,
      closedAt: null,
    },
    select: { id: true },
  });
}

/** Guest already seated in another open lobby (not started, not incomplete). */
export async function findGuestOtherOpenLobby(
  guestId: string,
  exceptSessionId: string,
): Promise<{ id: string } | null> {
  return prisma.gameSession.findFirst({
    where: {
      playerTwoId: guestId,
      id: { not: exceptSessionId },
      startedAt: null,
      incompleteAt: null,
      closedAt: null,
    },
    select: { id: true },
  });
}

export async function findIncompleteHostedSessions(hostId: string) {
  return prisma.gameSession.findMany({
    where: {
      playerOneId: hostId,
      incompleteAt: { not: null },
      closedAt: null,
    },
    select: {
      id: true,
      incompleteAt: true,
      playerTwo: { select: { displayName: true } },
    },
    orderBy: { incompleteAt: "desc" },
  });
}
