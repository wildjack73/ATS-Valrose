import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import LogoutButton from "../LogoutButton";

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-navy text-white no-print">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="font-bold">Admin ATS Valrose</span>
            <nav className="hidden sm:flex items-center gap-3 text-white/80">
              <Link className="hover:text-yellow-club" href="/admin">
                Tableau de bord
              </Link>
              <Link className="hover:text-yellow-club" href="/admin?tab=stages">
                Stages
              </Link>
              <Link className="hover:text-yellow-club" href="/admin?tab=ecole">
                École
              </Link>
            </nav>
          </div>
          <LogoutButton />
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
    </div>
  );
}
