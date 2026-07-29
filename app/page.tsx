import ResponsiveShell from "@/components/ResponsiveShell";
import StockDashboard from "@/components/StockDashboard";
import ThemeToggle from "@/components/ThemeToggle";

export default function Home() {
  return (
    <main className="min-h-dvh bg-background px-3 py-3 sm:px-4 sm:py-4">
      <ThemeToggle />
      <ResponsiveShell>
        <StockDashboard />
      </ResponsiveShell>
    </main>
  );
}
