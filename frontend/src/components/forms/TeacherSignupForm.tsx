"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { appRoutes } from "@/lib/routes";
import { saveRegistration } from "@/lib/auth-storage";

export function TeacherSignupForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    expertiseArea: "",
    password: "",
  });

  function updateField(field: keyof typeof formData, value: string) {
    setFormData((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    saveRegistration({
      role: "teacher",
      fullName: formData.fullName.trim(),
      email: formData.email.trim().toLowerCase(),
      expertiseArea: formData.expertiseArea.trim(),
      password: formData.password,
    });

    router.push(appRoutes.teacherChat);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-5 rounded-[2rem] border border-stone-200 bg-white p-6 shadow-[0_18px_40px_-28px_rgba(0,0,0,0.25)] sm:p-8"
    >
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-stone-900">
          Cadastro do professor
        </h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Esta etapa registra os dados iniciais do professor e libera o login validado localmente.
        </p>
      </div>

      <label className="grid gap-2 text-sm font-medium text-stone-700">
        Nome completo
        <input className="rounded-2xl border border-stone-300 px-4 py-3 outline-none transition focus:border-[#b05a2b]" type="text" placeholder="Digite seu nome" autoComplete="name" value={formData.fullName} onChange={(event) => updateField("fullName", event.target.value)} required />
      </label>

      <label className="grid gap-2 text-sm font-medium text-stone-700">
        E-mail institucional
        <input className="rounded-2xl border border-stone-300 px-4 py-3 outline-none transition focus:border-[#b05a2b]" type="email" placeholder="professor@escola.com" autoComplete="email" value={formData.email} onChange={(event) => updateField("email", event.target.value)} required />
      </label>

      <label className="grid gap-2 text-sm font-medium text-stone-700">
        Area de atuacao
        <input className="rounded-2xl border border-stone-300 px-4 py-3 outline-none transition focus:border-[#b05a2b]" type="text" placeholder="Ex.: Linguagens, Matematica" value={formData.expertiseArea} onChange={(event) => updateField("expertiseArea", event.target.value)} required />
      </label>

      <label className="grid gap-2 text-sm font-medium text-stone-700">
        Senha de acesso
        <input className="rounded-2xl border border-stone-300 px-4 py-3 outline-none transition focus:border-[#b05a2b]" type="password" placeholder="Crie uma senha" autoComplete="new-password" value={formData.password} onChange={(event) => updateField("password", event.target.value)} minLength={6} required />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className="rounded-full bg-[#b05a2b] px-5 py-3 text-sm font-semibold text-white"
        >
          Entrar
        </button>
      </div>
    </form>
  );
}
