"use client";

import { useActionState } from "react";
import { motion } from "framer-motion";
import { login } from "./actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-900/60 p-8 shadow-2xl backdrop-blur"
      >
        <h1 className="text-xl font-semibold text-neutral-100">tolli_admin</h1>
        <p className="mt-1 text-sm text-neutral-400">공유 비밀번호로 접속하세요.</p>

        <form action={action} className="mt-6 space-y-4">
          <Input
            type="password"
            name="password"
            placeholder="비밀번호"
            autoFocus
            required
            className="border-neutral-700 bg-neutral-950 text-neutral-100"
          />
          {state?.error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-red-400"
            >
              {state.error}
            </motion.p>
          )}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "확인 중..." : "입장하기"}
          </Button>
        </form>
      </motion.div>
    </main>
  );
}
