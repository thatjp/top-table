import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Game PIN | Top Table",
};

export default async function SettingsPinPage() {
  redirect("/profile?tab=account");
}
