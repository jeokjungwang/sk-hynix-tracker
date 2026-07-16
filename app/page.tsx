import StockDashboard from "@/components/StockDashboard";

export default function Home() {
  return (
    <main className="min-h-full px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <div className="mx-auto max-w-7xl">
        <StockDashboard />
      </div>
    </main>
  );
}
