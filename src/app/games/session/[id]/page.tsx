import type { Metadata } from "next";
import QRCode from "qrcode";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { buildJoinInviteUrl } from "@/lib/qr-token";
import { markStaleSessionsIncompleteNow } from "@/lib/game-session-lifecycle";
import { prisma } from "@/lib/prisma";
import { GameSessionContent } from "./GameSessionContent";

export const metadata: Metadata = {
  title: "Game session | Top Table",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function GameSessionPage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/games/session/${id}`);
  }

  await markStaleSessionsIncompleteNow();

  const row = await prisma.gameSession.findUnique({
    where: { id },
    include: {
      playerOne: { select: { id: true, displayName: true } },
      playerTwo: { select: { id: true, displayName: true } },
    },
  });

  if (!row) {
    notFound();
  }

  if (row.closedAt) {
    redirect("/");
  }

  const me = session.user.id;
  const isHost = row.playerOneId === me;
  const isGuest = row.playerTwoId !== null && row.playerTwoId === me;
  if (!isHost && !isGuest) {
    redirect("/");
  }

  const waitingForGuest = row.playerTwoId === null;
  let joinQrSvg: string | null = null;
  let joinUrl: string | null = null;
  if (waitingForGuest && isHost && row.inviteToken) {
    joinUrl = buildJoinInviteUrl(row.inviteToken);
    joinQrSvg = await QRCode.toString(joinUrl, {
      type: "svg",
      margin: 2,
      width: 280,
      color: { dark: "#18181b", light: "#ffffff" },
    });
  }

  return (
    <GameSessionContent
      sessionId={id}
      isHost={isHost}
      playerOneName={row.playerOne.displayName}
      guestName={row.playerTwo?.displayName ?? null}
      startedAtIso={row.startedAt ? row.startedAt.toISOString() : null}
      waitingForGuest={waitingForGuest}
      joinQrSvg={joinQrSvg}
      joinUrl={joinUrl}
      incompleteAtIso={row.incompleteAt ? row.incompleteAt.toISOString() : null}
    />
  );
}
