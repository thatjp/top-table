import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { clientIpFromRequest } from "@/lib/client-ip";
import { prisma } from "@/lib/prisma";
import { rateLimitFailuresBlocked, rateLimitFailuresRecord } from "@/lib/rate-limit";

/** bcrypt hash of "secret" — used to normalize work when email is unknown (timing). */
const BCRYPT_DUMMY =
  "$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vPGU01sDMS";

const LOGIN_FAIL_KEY_PREFIX = "login-fail:";
const LOGIN_FAIL_WINDOW_MS = 900_000;
const LOGIN_MAX_FAILURES = 20;

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const ip = clientIpFromRequest(request);
        const failKey = `${LOGIN_FAIL_KEY_PREFIX}${ip}`;
        if (rateLimitFailuresBlocked(failKey, LOGIN_MAX_FAILURES)) {
          return null;
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          await bcrypt.compare(password, BCRYPT_DUMMY);
          rateLimitFailuresRecord(failKey, LOGIN_FAIL_WINDOW_MS);
          return null;
        }

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) {
          rateLimitFailuresRecord(failKey, LOGIN_FAIL_WINDOW_MS);
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.displayName,
          validated: user.validated,
          isAdmin: user.isAdmin,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.validated = user.validated;
        token.isAdmin = user.isAdmin;
      }
      if (token.id) {
        const row = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { validated: true, isAdmin: true },
        });
        if (row) {
          token.validated = row.validated;
          token.isAdmin = row.isAdmin;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = String(token.id);
        session.user.validated = Boolean(token.validated);
        session.user.isAdmin = Boolean(token.isAdmin);
      }
      return session;
    },
  },
});
