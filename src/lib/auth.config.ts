import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

// Edge-compatible auth config (no Node.js-only imports like Prisma)
// The authorize callback is only called on the server, not in middleware,
// so we provide a minimal config here for middleware JWT verification.
export const authConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    // We need to declare the provider here so middleware can verify the JWT,
    // but the actual authorize logic is in auth.ts
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");
      const isOnApi =
        nextUrl.pathname.startsWith("/api") &&
        !nextUrl.pathname.startsWith("/api/auth") &&
        !nextUrl.pathname.startsWith("/api/monitor");

      if (isOnDashboard) {
        if (!isLoggedIn) return false; // Redirect to login
        return true;
      }

      if (isOnApi) {
        if (!isLoggedIn) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        return true;
      }

      return true;
    },
  },
} satisfies NextAuthConfig;

