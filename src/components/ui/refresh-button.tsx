"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function RefreshButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        setPending(true);
        router.refresh();
        setTimeout(() => setPending(false), 600);
      }}
    >
      {pending ? "새로고침 중..." : "새로고침"}
    </Button>
  );
}
