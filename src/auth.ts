import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { clientIpFromRequest } from "@/lib/client-ip";
import { prisma } from "@/lib/prisma";
import { rateLimitFailuresBlocked, rateLimitFailuresRecord } from "@/lib/rate-limit";
import { resolveUserByLoginIdentifier } from "@/lib/resolve-login-identifier";

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
        email: { label: "Email or display name", type: "text" },
        password: { label: "Password", type: "password" },
        pin: { label: "Game PIN", type: "text" },
      },
      async authorize(credentials, request) {
        const loginRaw = credentials?.email as string | undefined;
        const loginLookup = loginRaw?.trim() ?? "";
        const password = credentials?.password as string | undefined;
        const pin = credentials?.pin as string | undefined;

        if (!loginLookup) return null;

        const hasPassword = typeof password === "string" && password.length > 0;
        const pinOnly =
          typeof pin === "string" &&
          /^\d{4}$/.test(pin) &&
          !hasPassword;

        if (!pinOnly && (!hasPassword || (password?.length ?? 0) < 8)) {
          return null;
        }

        const ip = clientIpFromRequest(request);
        const failKey = `${LOGIN_FAIL_KEY_PREFIX}${ip}`;
        if (rateLimitFailuresBlocked(failKey, LOGIN_MAX_FAILURES)) {
          return null;
        }

        const resolved = await resolveUserByLoginIdentifier(loginLookup);
        if (!resolved.ok) {
          await bcrypt.compare(pinOnly ? (pin as string) : (password as string), BCRYPT_DUMMY);
          rateLimitFailuresRecord(failKey, LOGIN_FAIL_WINDOW_MS);
          return null;
        }
        const user = resolved.user;

        if (pinOnly) {
          if (!user.pinHash) {
            await bcrypt.compare(pin, BCRYPT_DUMMY);
            rateLimitFailuresRecord(failKey, LOGIN_FAIL_WINDOW_MS);
            return null;
          }
          const pinOk = await bcrypt.compare(pin, user.pinHash);
          if (!pinOk) {
            rateLimitFailuresRecord(failKey, LOGIN_FAIL_WINDOW_MS);
            return null;
          }
        } else {
          const ok = await bcrypt.compare(password!, user.passwordHash);
          if (!ok) {
            rateLimitFailuresRecord(failKey, LOGIN_FAIL_WINDOW_MS);
            return null;
          }
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
          select: { validated: true, isAdmin: true, displayName: true, email: true },
        });
        if (row) {
          token.validated = row.validated;
          token.isAdmin = row.isAdmin;
          token.name = row.displayName;
          token.email = row.email;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = String(token.id);
        session.user.validated = Boolean(token.validated);
        session.user.isAdmin = Boolean(token.isAdmin);
        if (typeof token.name === "string") session.user.name = token.name;
        if (typeof token.email === "string") session.user.email = token.email;
      }
      return session;
    },
  },
});
