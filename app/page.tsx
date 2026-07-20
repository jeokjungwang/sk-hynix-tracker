import FitScale from "@/components/FitScale";
import StockDashboard from "@/components/StockDashboard";
import ThemeToggle from "@/components/ThemeToggle";

export default function Home() {
  return (
    <main className="h-dvh overflow-hidden px-3 py-3">
      <ThemeToggle />
      <FitScale designWidth={1600}>
        <StockDashboard />
      </FitScale>
    </main>
  );
}
