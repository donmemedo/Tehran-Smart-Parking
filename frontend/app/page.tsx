import Header from "@/components/Header";
import Hero from "@/components/Hero";
import LiveMap from "@/components/LiveMap";
import Zones from "@/components/Zones";
import Pricing from "@/components/Pricing";
import OpenData from "@/components/OpenData";
import Footer from "@/components/Footer";
import ZoneSheet from "@/components/ZoneSheet";
import { RevealObserver } from "@/lib/app";

/* Server component: only the pieces that need state are client components. The zone sheet sits
   outside #app-root so it can mark the rest of the page inert while it is open. */
export default function Home() {
  return (
    <>
      <div id="app-root">
        <Header />
        <main>
          <Hero />
          <LiveMap />
          <Zones />
          <Pricing />
          <OpenData />
        </main>
        <Footer />
      </div>
      <ZoneSheet />
      <RevealObserver />
    </>
  );
}
