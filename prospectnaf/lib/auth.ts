import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './db'
import type { Plan } from '@/types/plan'

declare module 'next-auth' {
  interface User {
    plan: Plan
    searchesToday: number
  }
  interface Session {
    user: {
      id: string
      email: string
      plan: Plan
      searchesToday: number
    }
  }
  interface JWT {
    plan?: Plan
    searchesToday?: number
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mot de passe', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })
        if (!user) return null

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        )
        if (!valid) return null

        return {
          id: user.id,
          email: user.email,
          plan: user.plan as Plan,
          searchesToday: user.searchesToday,
        }
      },
    }),
  ],
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id
        token.plan = (user as { plan: Plan }).plan
        token.searchesToday = (user as { searchesToday: number }).searchesToday
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.sub!
      session.user.plan = (token.plan ?? 'FREE') as Plan
      session.user.searchesToday = (token.searchesToday ?? 0) as number
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
})
