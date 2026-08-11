import Image from "next/image";

import { systemTagline } from "@/lib/content";

export function HeroSection() {
  return (
    <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
      <div className="space-y-5">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#b05a2b]">
          Educacao com acolhimento
        </p>
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl lg:text-6xl">
          Inteligencia que acolhe o aprendizado.
        </h1>
        <p className="max-w-xl text-base leading-8 text-stone-600 sm:text-lg">
          {systemTagline}
        </p>
      </div>

      <div className="relative overflow-hidden rounded-[2rem] border border-stone-200 bg-[#f5ead7] shadow-[0_24px_60px_-32px_rgba(84,56,24,0.45)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.9),_transparent_45%),linear-gradient(135deg,_rgba(31,95,91,0.1),_rgba(176,90,43,0.08))]" />
        <Image
          src="/images/study-hero.svg"
          alt="Ilustracao de estudantes e materiais de estudo em um ambiente acolhedor"
          width={720}
          height={540}
          priority
          className="relative h-full w-full object-cover"
        />
      </div>
    </section>
  );
}
