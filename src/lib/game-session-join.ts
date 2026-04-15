import { prisma } from "@/lib/prisma";
import {
  findGuestOtherOpenLobby,
  findLiveActiveSessionForUser,
  markStaleSessionsIncompleteNow,
} from "@/lib/game-session-lifecycle";

export type JoinByUserResult =
  | { ok: true; sessionId: string }
  | { ok: false; status: number; error: string };

export async function joinSessionAsUser(
  inviteToken: string,
  guestId: string,
): Promise<JoinByUserResult> {
  const row = await prisma.gameSession.findUnique({
    where: { inviteToken },
    select: {
      id: true,
      playerOneId: true,
      playerTwoId: true,
    },
  });

  if (!row || row.playerTwoId !== null) {
    return {
      ok: false,
      status: 400,
      error: "This invite is invalid or the game already has two players.",
    };
  }

  const guest = await prisma.user.findUnique({
    where: { id: guestId },
    select: { id: true, validated: true, isDemo: true, pinHash: true },
  });
  if (!guest) {
    return { ok: false, status: 404, error: "User not found." };
  }

  if (!guest.pinHash) {
    return { ok: false, status: 403, error: "No game PIN set." };
  }
  if (!guest.validated || guest.isDemo) {
    return {
      ok: false,
      status: 403,
      error: "Only approved, non-demo accounts can join this way.",
    };
  }
  if (guest.id === row.playerOneId) {
    return { ok: false, status: 400, error: "You cannot join your own game." };
  }

  await markStaleSessionsIncompleteNow();
  if (await findLiveActiveSessionForUser(guest.id)) {
    return {
      ok: false,
      status: 409,
      error:
        "You already have a match in progress. Open it from the home page or wait for it to time out before joining another game.",
    };
  }
  if (await findGuestOtherOpenLobby(guest.id, row.id)) {
    return {
      ok: false,
      status: 409,
      error:
        "You are already in another game lobby. Open that session or leave it before joining this one.",
    };
  }

  const updated = await prisma.gameSession.updateMany({
    where: { id: row.id, playerTwoId: null, inviteToken },
    data: { playerTwoId: guest.id, inviteToken: null },
  });

  if (updated.count !== 1) {
    return {
      ok: false,
      status: 409,
      error: "This game was just joined by someone else. Ask for a new invite.",
    };
  }

  return { ok: true, sessionId: row.id };
}
