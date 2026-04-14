import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      validated: boolean;
      isAdmin: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    validated: boolean;
    isAdmin: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    validated: boolean;
    isAdmin: boolean;
  }
}
