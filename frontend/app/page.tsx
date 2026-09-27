"use client";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import LiveMap from "@/components/LiveMap";
import Zones from "@/components/Zones";
import Pricing from "@/components/Pricing";
import OpenData from "@/components/OpenData";
import Footer from "@/components/Footer";
import ZoneSheet from "@/components/ZoneSheet";
import { useReveal } from "@/lib/app";

export default function Home() {
  useReveal();
  return (
    <main>
      <Header />
      <Hero />
      <LiveMap />
      <Zones />
      <Pricing />
      <OpenData />
      <Footer />
      <ZoneSheet />
    </main>
  );
}
