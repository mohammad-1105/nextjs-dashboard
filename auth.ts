import { z } from "zod";
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import Credentials from "next-auth/providers/credentials";
import bcryptjs from "bcryptjs";
import { User } from "./app/lib/definitions";
import postgres from "postgres";

const sql = postgres(process.env.POSTGRES_URL!, { ssl: "require" });

const getUserByEmail = async (email: string): Promise<User | undefined> => {
  try {
    const users = await sql`SELECT * FROM users WHERE email = ${email}`;
    return users[0] as User;
  } catch (error) {
    console.log("Failed to get user by email", error);
    throw new Error("Failed to get user by email");
  }
};

export const { auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize({ credentials }) {
        const parsedCredentials = z
          .object({
            email: z.string().email(),
            password: z.string().min(6),
          })
          .safeParse(credentials);

        if (parsedCredentials.success) {
          const { email, password } = parsedCredentials.data;
          const user = await getUserByEmail(email);
          if (!user) {
            return null;
          }
          const isPasswordValid = await bcryptjs.compare(
            password,
            user.password
          );
          if (isPasswordValid){
            return user
          }
        }
        console.log("Invalid credentials");
        return null;
      },
    }),
  ],
});
