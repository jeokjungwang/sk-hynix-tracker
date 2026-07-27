import ResponsiveShell from "@/components/ResponsiveShell";
import StockDashboard from "@/components/StockDashboard";
import ThemeToggle from "@/components/ThemeToggle";

export default function Home() {
  return (
    <main className="h-dvh overflow-y-auto px-3 py-3">
      <ThemeToggle />
      <ResponsiveShell>
        <StockDashboard />
      </ResponsiveShell>
    </main>
  );
}
