"use client";
import Header from "@/components/Header";
import Dashboard from "@/components/Dashboard";
import Footer from "@/components/Footer";
import ZoneSheet from "@/components/ZoneSheet";

export default function DashboardPage() {
  return (
    <main>
      <Header page="dashboard" />
      <Dashboard />
      <Footer />
      <ZoneSheet />
    </main>
  );
}
