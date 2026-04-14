import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/RegisterForm";

export const metadata: Metadata = {
  title: "Register | Top Table",
  description: "Create an account to log pool games",
};

export default function RegisterPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-1 flex-col px-4 py-12">
      <Link
        href="/"
        className="mb-8 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
      >
        ← Back to leaderboard
      </Link>
      <h1 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Register</h1>
      <p className="mb-8 max-w-lg text-zinc-600 dark:text-zinc-400">
        New accounts start unranked until an admin validates you. After validation, you can log games
        and appear on the leaderboard once you have enough recorded matches.
      </p>
      <RegisterForm />
    </div>
  );
}
