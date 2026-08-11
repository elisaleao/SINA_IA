"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { appRoutes } from "@/lib/routes";
import { clearStudentLearningProfile, saveRegistration } from "@/lib/auth-storage";

export function StudentSignupForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    birthDate: "",
    roomCode: "",
    password: "",
  });

  function updateField(field: keyof typeof formData, value: string) {
    setFormData((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    saveRegistration({
      role: "student",
      fullName: formData.fullName.trim(),
      email: formData.email.trim().toLowerCase(),
      birthDate: formData.birthDate,
      roomCode: formData.roomCode.trim(),
      password: formData.password,
    });
    clearStudentLearningProfile();

    router.push(appRoutes.studentLearningProfile);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-5 rounded-[2rem] border border-stone-200 bg-white p-6 shadow-[0_18px_40px_-28px_rgba(0,0,0,0.25)] sm:p-8"
    >
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-stone-900">
          Cadastro do aluno
        </h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Preencha os dados iniciais para liberar o acesso e validar o login localmente nesta fase.
        </p>
      </div>

      <label className="grid gap-2 text-sm font-medium text-stone-700">
        Nome completo
        <input className="rounded-2xl border border-stone-300 px-4 py-3 outline-none transition focus:border-[#1f5f5b]" type="text" placeholder="Digite seu nome" autoComplete="name" value={formData.fullName} onChange={(event) => updateField("fullName", event.target.value)} required />
      </label>

      <label className="grid gap-2 text-sm font-medium text-stone-700">
        E-mail
        <input className="rounded-2xl border border-stone-300 px-4 py-3 outline-none transition focus:border-[#1f5f5b]" type="email" placeholder="aluno@exemplo.com" autoComplete="email" value={formData.email} onChange={(event) => updateField("email", event.target.value)} required />
      </label>

      <label className="grid gap-2 text-sm font-medium text-stone-700">
        Data de nascimento
        <input className="rounded-2xl border border-stone-300 px-4 py-3 outline-none transition focus:border-[#1f5f5b]" type="date" value={formData.birthDate} onChange={(event) => updateField("birthDate", event.target.value)} required />
      </label>

      <label className="grid gap-2 text-sm font-medium text-stone-700">
        Senha ou codigo da sala
        <input className="rounded-2xl border border-stone-300 px-4 py-3 outline-none transition focus:border-[#1f5f5b]" type="text" placeholder="Codigo da sala, se houver" value={formData.roomCode} onChange={(event) => updateField("roomCode", event.target.value)} />
      </label>

      <label className="grid gap-2 text-sm font-medium text-stone-700">
        Senha de acesso
        <input className="rounded-2xl border border-stone-300 px-4 py-3 outline-none transition focus:border-[#1f5f5b]" type="password" placeholder="Crie uma senha" autoComplete="new-password" value={formData.password} onChange={(event) => updateField("password", event.target.value)} minLength={6} required />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className="rounded-full bg-[#1f5f5b] px-5 py-3 text-sm font-semibold text-white"
        >
          Entrar
        </button>
      </div>
    </form>
  );
}
