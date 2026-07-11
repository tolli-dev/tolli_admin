"use server";

import { timingSafeEqual } from "crypto";
import { redirect } from "next/navigation";
import { createSession } from "@/lib/session";

export type LoginFormState = { error?: string } | undefined;

function passwordsMatch(input: string, expected: string) {
  const inputBuffer = Buffer.from(input);
  const expectedBuffer = Buffer.from(expected);
  if (inputBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(inputBuffer, expectedBuffer);
}

export async function login(_state: LoginFormState, formData: FormData): Promise<LoginFormState> {
  const password = String(formData.get("password") ?? "");
  const expected = process.env.ADMIN_DASHBOARD_PASSWORD;

  if (!expected) {
    return { error: "서버에 ADMIN_DASHBOARD_PASSWORD가 설정되어 있지 않아요." };
  }

  if (!password || !passwordsMatch(password, expected)) {
    return { error: "비밀번호가 올바르지 않아요." };
  }

  await createSession();
  redirect("/overview");
}
