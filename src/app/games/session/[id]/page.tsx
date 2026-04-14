import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { GameSessionContent } from "./GameSessionContent";

export const metadata: Metadata = {
  title: "Game started | Top Table",
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

  const me = session.user.id;
  if (row.playerOneId !== me && row.playerTwoId !== me) {
    redirect("/");
  }

  return (
    <GameSessionContent
      sessionId={id}
      playerOneName={row.playerOne.displayName}
      playerTwoName={row.playerTwo.displayName}
      startedAtIso={row.startedAt.toISOString()}
    />
  );
}
