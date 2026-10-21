import Header from "@/components/Header";
import Dashboard from "@/components/Dashboard";
import Footer from "@/components/Footer";
import ZoneSheet from "@/components/ZoneSheet";

export default function DashboardPage() {
  return (
    <>
      <div id="app-root">
        <Header page="dashboard" />
        <main>
          <Dashboard />
        </main>
        <Footer />
      </div>
      <ZoneSheet />
    </>
  );
}
