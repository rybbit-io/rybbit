import { User } from "better-auth";
import { create } from "zustand";
import { authClient } from "./auth";

export const userStore = create<{
  user: User | null;
  isPending: boolean;
  setSession: (user: User) => void;
  setIsPending: (isPending: boolean) => void;
}>(set => ({
  user: null,
  isPending: true,
  setSession: user => set({ user }),
  setIsPending: isPending => set({ isPending }),
}));

authClient.getSession().then(({ data: session }) => {
  userStore.setState({
    user: session?.user,
    isPending: false,
  });
});
