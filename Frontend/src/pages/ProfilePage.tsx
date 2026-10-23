import { DashboardNavbar } from "../components/DashboardNavbar";

export default function ProfilePage() {
  return (
    <main className="className=min-h-svh bg-white text-ink">
      <DashboardNavbar />
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="mt-2 italic text-gray-500">To be continued in Sprint 2</p>
      </div>
    </main>
  );
}
