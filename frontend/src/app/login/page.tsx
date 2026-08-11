"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  getRegistration,
  getStudentLearningProfile,
  type UserRole,
} from "@/lib/auth-storage";
import { appRoutes } from "@/lib/routes";

const roleOptions: Array<{
  value: UserRole;
  title: string;
  tone: string;
  signupHref: string;
}> = [
  {
    value: "student",
    title: "Aluno",
    tone: "bg-[#1f5f5b] text-white border-[#1f5f5b]",
    signupHref: appRoutes.student,
  },
  {
    value: "teacher",
    title: "Professor",
    tone: "bg-[#b05a2b] text-white border-[#b05a2b]",
    signupHref: appRoutes.teacher,
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<UserRole>("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const activeRole = roleOptions.find((option) => option.value === role) ?? roleOptions[0];

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const registration = getRegistration(role);

    if (!registration) {
      setErrorMessage("Nenhum cadastro foi encontrado para esse perfil. Faça o cadastro antes de entrar.");
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (registration.email !== normalizedEmail || registration.password !== password) {
      setErrorMessage("Os dados informados nao correspondem ao cadastro salvo.");
      return;
    }

    setErrorMessage("");
    if (role === "student") {
      router.push(
        getStudentLearningProfile()
          ? appRoutes.studentChat
          : appRoutes.studentLearningProfile,
      );
      return;
    }

    router.push(appRoutes.teacherChat);
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 py-12 lg:px-8 lg:py-16">
      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="grid gap-4">
          {roleOptions.map((option) => {
            const isActive = option.value === role;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setRole(option.value);
                  setErrorMessage("");
                }}
                aria-pressed={isActive}
                className={`rounded-[2rem] border px-6 py-6 text-left transition ${
                  isActive
                    ? option.tone
                    : "border-stone-200 bg-white text-stone-900 hover:border-stone-300"
                }`}
              >
                <h2 className="text-3xl font-semibold tracking-tight">
                  {option.title}
                </h2>
              </button>
            );
          })}
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid gap-5 rounded-[2rem] border border-stone-200 bg-white p-6 shadow-[0_18px_40px_-28px_rgba(0,0,0,0.25)] sm:p-8"
        >
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-stone-900">
              Acessar como {activeRole.title.toLowerCase()}
            </h2>
            <p className="mt-3 text-sm leading-7 text-stone-600">
              Use o mesmo e-mail e a mesma senha informados no cadastro.
            </p>
          </div>

          <label className="grid gap-2 text-sm font-medium text-stone-700">
            E-mail
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={role === "student" ? "aluno@exemplo.com" : "professor@escola.com"}
              autoComplete="email"
              className="rounded-2xl border border-stone-300 px-4 py-3 outline-none transition focus:border-[#1f5f5b]"
              required
            />
          </label>

          <label className="grid gap-2 text-sm font-medium text-stone-700">
            Senha
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Digite sua senha"
              autoComplete="current-password"
              className="rounded-2xl border border-stone-300 px-4 py-3 outline-none transition focus:border-[#1f5f5b]"
              required
            />
          </label>

          {errorMessage ? (
            <div role="alert" className="rounded-2xl border border-[#b05a2b]/30 bg-[#fff5ee] px-4 py-3 text-sm leading-6 text-[#8e4319]">
              {errorMessage}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-700"
            >
              Entrar
            </button>
            <a
              href={activeRole.signupHref}
              className="rounded-full border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-800 transition hover:border-stone-900 hover:text-stone-950"
            >
              Ir para o cadastro
            </a>
          </div>
        </form>
      </section>
    </main>
  );
}