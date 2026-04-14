import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { auth } from "@/auth";
import { AccountForm } from "@/components/AccountForm";
import { SettingsPinForm } from "@/components/SettingsPinForm";
import { buildQrVerifyUrl, createHostToken } from "@/lib/qr-token";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Profile | Top Table",
};

type Tab = "qr" | "account" | "stats";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function parseTab(raw: string | string[] | undefined): Tab {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === "account" || value === "stats") return value;
  return "qr";
}

function pieGradient(wins: number, losses: number): string {
  const total = wins + losses;
  if (total <= 0) return "conic-gradient(#d4d4d8 0turn 1turn)";
  const winTurn = wins / total;
  return `conic-gradient(#16a34a 0turn ${winTurn}turn, #dc2626 ${winTurn}turn 1turn)`;
}

export default async function ProfilePage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const tab = parseTab(sp.tab);

  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/profile");
  }

  const [user, wins, losses] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        displayName: true,
        email: true,
        pinHash: true,
        validated: true,
        isDemo: true,
      },
    }),
    prisma.game.count({ where: { winnerId: session.user.id } }),
    prisma.game.count({ where: { loserId: session.user.id } }),
  ]);

  if (!user) {
    redirect("/login");
  }

  let qrSvg: string | null = null;
  let qrUrl: string | null = null;
  if (tab === "qr" && user.validated && !user.isDemo && user.pinHash) {
    const token = createHostToken(user.id);
    qrUrl = buildQrVerifyUrl(token);
    qrSvg = await QRCode.toString(qrUrl, {
      type: "svg",
      margin: 2,
      width: 280,
      color: { dark: "#18181b", light: "#ffffff" },
    });
  }

  const gamesPlayed = wins + losses;
  const winPct = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0;
  const lossPct = gamesPlayed > 0 ? 100 - winPct : 0;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-12">
      <h1 className="mb-4 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {user.displayName}
      </h1>

      <div className="mb-8 flex gap-2 border-b border-zinc-200 pb-2 dark:border-zinc-800">
        <Link
          href="/profile?tab=qr"
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            tab === "qr"
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
          }`}
        >
          QR
        </Link>
        <Link
          href="/profile?tab=account"
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            tab === "account"
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
          }`}
        >
          Account
        </Link>
        <Link
          href="/profile?tab=stats"
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            tab === "stats"
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
          }`}
        >
          My Stats
        </Link>
      </div>

      {tab === "qr" ? (
        <div className="max-w-xl">
          {!user.validated || user.isDemo ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Your account must be approved and non-demo before you can use a QR code.
            </p>
          ) : !user.pinHash ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Set a game PIN first in the <strong>Account</strong> tab.
            </p>
          ) : (
            <>
              <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
                Have your opponent scan this QR code, then enter their game PIN to start a verified
                game.
              </p>
              <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
                <div
                  className="mx-auto w-fit [&_svg]:h-auto [&_svg]:max-w-full"
                  dangerouslySetInnerHTML={{ __html: qrSvg ?? "" }}
                />
              </div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Link (expires)
              </p>
              <code className="block break-all rounded-lg bg-zinc-100 px-3 py-2 text-xs text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                {qrUrl}
              </code>
            </>
          )}
        </div>
      ) : null}

      {tab === "account" ? (
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Account</h2>
            <AccountForm initialDisplayName={user.displayName} initialEmail={user.email} />
          </div>
          <div>
            <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Game PIN</h2>
            <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
              Use this 4-digit PIN when you scan someone else&apos;s QR code.
            </p>
            <SettingsPinForm hasExistingPin={!!user.pinHash} />
          </div>
        </div>
      ) : null}

      {tab === "stats" ? (
        <div className="max-w-md rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">My Stats</h2>
          <div className="mb-6 flex items-center gap-6">
            <div
              className="h-36 w-36 rounded-full border border-zinc-200 dark:border-zinc-700"
              style={{ background: pieGradient(wins, losses) }}
              role="img"
              aria-label={`Wins ${winPct} percent, losses ${lossPct} percent`}
            />
            <div className="space-y-2 text-sm">
              <p className="text-zinc-700 dark:text-zinc-300">Games played: {gamesPlayed}</p>
              <p className="text-emerald-700 dark:text-emerald-300">Wins: {wins}</p>
              <p className="text-red-700 dark:text-red-300">Losses: {losses}</p>
            </div>
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Win/Loss share: {winPct}% wins / {lossPct}% losses
          </p>
        </div>
      ) : null}
    </div>
  );
}
