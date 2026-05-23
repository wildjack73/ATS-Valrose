import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import LoginForm from "./LoginForm";

export const metadata = { title: "Admin — ATS Valrose" };

export default async function AdminLoginPage() {
  if (await isAdminAuthenticated()) {
    redirect("/admin");
  }
  return (
    <div className="bg-cyan-club min-h-[60vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-navy mb-1">Admin ATS Valrose</h1>
        <p className="text-sm text-gray-600 mb-6">
          Accès réservé au gestionnaire du club.
        </p>
        <LoginForm />
      </div>
    </div>
  );
}
