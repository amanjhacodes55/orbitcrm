import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { dbConnect } from "@/lib/db";
import { User } from "@/lib/models";

const providers: NextAuthOptions["providers"] = [
  Credentials({
    name: "Email",
    credentials: { email: {}, password: {} },
    async authorize(c) {
      if (!c?.email || !c.password) return null;
      await dbConnect();
      const u = await User.findOne({ email: c.email.toLowerCase().trim() }).select("+passwordHash");
      if (!u?.passwordHash || !(await bcrypt.compare(c.password, u.passwordHash))) return null;
      return { id: String(u._id), name: u.name, email: u.email };
    },
  }),
];
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
  providers.push(Google({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET }));

export const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const authOptions: NextAuthOptions = {
  providers,
  session: { strategy: "jwt", maxAge: 30 * 86400 },
  pages: { signIn: "/login" },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "credentials" || !user.email) return true;
      await dbConnect();
      const email = user.email.toLowerCase();
      const existing = await User.findOne({ email });
      if (existing) await User.updateOne({ _id: existing._id }, { $addToSet: { providers: account!.provider }, ...(existing.image ? {} : { image: user.image || "" }) });
      else await User.create({ name: user.name || email.split("@")[0], email, image: user.image || "", providers: [account!.provider] });
      return true;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        await dbConnect();
        const u = await User.findOne({ email: user.email.toLowerCase() }).select("_id").lean();
        if (u) token.uid = String(u._id);
      }
      return token;
    },
    async session({ session, token }) {
      if (token.uid) session.user = { ...session.user, id: token.uid } as typeof session.user;
      return session;
    },
  },
};

export async function sessionUserId(): Promise<string | null> {
  const s = await getServerSession(authOptions);
  return s?.user?.id ?? null;
}
