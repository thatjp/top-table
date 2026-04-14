"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function approveUser(formData: FormData) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return;
  }

  const userId = formData.get("userId");
  if (typeof userId !== "string" || !userId) {
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { validated: true },
  });

  revalidatePath("/admin");
}
