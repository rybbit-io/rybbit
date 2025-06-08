import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import type { User } from "@rybbit/shared";
import type { Context } from "./context.js";

const users: Record<string, User> = {};

// Define schemas locally
const getUserByIdSchema = z.string();
const createUserSchema = z.object({
  name: z.string().min(3),
  bio: z.string().max(142).optional(),
});

export const t = initTRPC.context<Context>().create();

// Auth middleware
const isAuthed = t.middleware(({ next, ctx }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to access this resource",
    });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user, // user is now guaranteed to be non-null
    },
  });
});

// Public procedure (no auth required)
export const publicProcedure = t.procedure;

// Protected procedure (auth required)
export const protectedProcedure = t.procedure.use(isAuthed);

export const appRouter = t.router({
  getUserById: publicProcedure.input(getUserByIdSchema).query((opts) => {
    console.log("getUserById", opts.input);
    return opts.input; // input type is string
  }),
  createUser: protectedProcedure.input(createUserSchema).mutation((opts) => {
    const id = Date.now().toString();
    const user: User = { id, ...opts.input };
    users[user.id] = user;
    return user;
  }),
});

// export type definition of API
export type AppRouter = typeof appRouter;
