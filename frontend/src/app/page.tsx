import { HeroSection } from "@/components/home/HeroSection";
import { RoleNavigation } from "@/components/home/RoleNavigation";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 py-10 lg:px-8 lg:py-14">
      <HeroSection />
      <RoleNavigation />
    </main>
  );
}
