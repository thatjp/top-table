import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "QR | Top Table",
};

export default async function MyQrPage() {
  redirect("/profile");
}
