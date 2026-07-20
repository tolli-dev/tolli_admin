import { redirect } from "next/navigation";
import Link from "next/link";
import { isAuthenticated, deleteSession } from "@/lib/session";
import { FUNNELS } from "@/lib/funnels/definitions";
import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  { href: "/overview", label: "개요" },
  { href: "/retention", label: "재방문 · 리텐션" },
  ...FUNNELS.map((funnel) => ({ href: `/funnels/${funnel.id}`, label: funnel.title })),
  { href: "/store", label: "스토어 현황" },
  { href: "/events", label: "이벤트 탐색기" },
];

async function logout() {
  "use server";
  await deleteSession();
  redirect("/login");
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const authed = await isAuthenticated();
  if (!authed) redirect("/login");

  return (
    <div className="flex min-h-screen bg-neutral-950 text-neutral-100">
      <aside className="w-60 flex-none border-r border-neutral-800 p-6">
        <p className="text-sm font-semibold tracking-wide text-neutral-400">tolli_admin</p>
        <nav className="mt-6 flex flex-col gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-neutral-50"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <form action={logout} className="mt-8">
          <Button type="submit" variant="ghost" size="sm" className="text-neutral-500">
            로그아웃
          </Button>
        </form>
      </aside>
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
