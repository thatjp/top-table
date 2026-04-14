import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { auth } from "@/auth";
import { buildQrVerifyUrl, createHostToken } from "@/lib/qr-token";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "My QR | Top Table",
  description: "QR code for opponents to start a verified game",
};

export default async function MyQrPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/me/qr");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { pinHash: true, validated: true, isDemo: true },
  });

  if (!user?.validated || user.isDemo) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <p className="text-zinc-600 dark:text-zinc-400">
          Your account must be approved before you can use My QR. Demo accounts cannot use this
          feature.
        </p>
        <Link href="/" className="mt-4 inline-block text-sm text-violet-700 underline">
          Back home
        </Link>
      </div>
    );
  }

  if (!user.pinHash) {
    redirect("/settings/pin?callbackUrl=/me/qr");
  }

  const token = createHostToken(session.user.id);
  const url = buildQrVerifyUrl(token);
  const svg = await QRCode.toString(url, {
    type: "svg",
    margin: 2,
    width: 280,
    color: { dark: "#18181b", light: "#ffffff" },
  });

  return (
    <div className="mx-auto flex max-w-4xl flex-1 flex-col px-4 py-12">
      <Link
        href="/"
        className="mb-8 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
      >
        ← Home
      </Link>
      <h1 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">My QR</h1>
      <p className="mb-6 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
        Have your opponent scan this code with their phone. They must be logged in and enter{" "}
        <strong>their</strong> game PIN to start a session. You stay on this screen so they can scan
        from your device, or they can screenshot the code.
      </p>
      <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <div
          className="mx-auto w-fit [&_svg]:h-auto [&_svg]:max-w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Link (expires)</p>
      <code className="mb-8 block break-all rounded-lg bg-zinc-100 px-3 py-2 text-xs text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
        {url}
      </code>
    </div>
  );
}
