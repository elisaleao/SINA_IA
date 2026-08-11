"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  getRegistration,
  saveStudentLearningProfile,
} from "@/lib/auth-storage";
import { appRoutes } from "@/lib/routes";

const formatOptions = [
  "Explicacoes objetivas e diretas",
  "Exemplos praticos passo a passo",
  "Textos com linguagem simples",
  "Apoio com imagens e analogias",
];

const paceOptions = [
  "Prefiro avancar devagar, revisando cada etapa",
  "Aprendo melhor em um ritmo equilibrado",
  "Gosto de desafios mais rapidos e dinamicos",
];

export function StudentLearningProfileForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    preferredFormat: formatOptions[0],
    learningPace: paceOptions[1],
    mainDifficulty: "",
    supportNeeds: "",
    studyGoal: "",
  });
  const [errorMessage, setErrorMessage] = useState("");

  function updateField(field: keyof typeof formData, value: string) {
    setFormData((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const registration = getRegistration("student");

    if (!registration || registration.role !== "student") {
      setErrorMessage("Finalize o cadastro do aluno antes de preencher este perfil.");
      return;
    }

    saveStudentLearningProfile({
      preferredFormat: formData.preferredFormat,
      learningPace: formData.learningPace,
      mainDifficulty: formData.mainDifficulty.trim(),
      supportNeeds: formData.supportNeeds.trim(),
      studyGoal: formData.studyGoal.trim(),
    });

    setErrorMessage("");
    router.push(appRoutes.studentChat);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-5 rounded-[2rem] border border-stone-200 bg-white p-6 shadow-[0_18px_40px_-28px_rgba(0,0,0,0.25)] sm:p-8"
    >
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-stone-900">
          Perfil de aprendizagem do aluno
        </h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Essas respostas ajudam a adaptar melhor os proximos recursos com IA para a realidade de cada estudante.
        </p>
      </div>

      <label className="grid gap-2 text-sm font-medium text-stone-700">
        Como voce prefere receber explicacoes?
        <select
          value={formData.preferredFormat}
          onChange={(event) => updateField("preferredFormat", event.target.value)}
          className="rounded-2xl border border-stone-300 bg-white px-4 py-3 outline-none transition focus:border-[#1f5f5b]"
          required
        >
          {formatOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-2 text-sm font-medium text-stone-700">
        Qual ritmo de estudo funciona melhor para voce?
        <select
          value={formData.learningPace}
          onChange={(event) => updateField("learningPace", event.target.value)}
          className="rounded-2xl border border-stone-300 bg-white px-4 py-3 outline-none transition focus:border-[#1f5f5b]"
          required
        >
          {paceOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-2 text-sm font-medium text-stone-700">
        Em qual ponto do aprendizado voce sente mais dificuldade hoje?
        <textarea
          value={formData.mainDifficulty}
          onChange={(event) => updateField("mainDifficulty", event.target.value)}
          placeholder="Ex.: concentracao, leitura, organizacao, matematica, interpretacao..."
          className="min-h-28 rounded-2xl border border-stone-300 bg-white px-4 py-3 outline-none transition focus:border-[#1f5f5b]"
          required
        />
      </label>

      <label className="grid gap-2 text-sm font-medium text-stone-700">
        Que tipo de apoio torna o estudo mais confortavel para voce?
        <textarea
          value={formData.supportNeeds}
          onChange={(event) => updateField("supportNeeds", event.target.value)}
          placeholder="Ex.: instrucoes mais curtas, revisoes frequentes, exemplos visuais, pausas entre atividades..."
          className="min-h-28 rounded-2xl border border-stone-300 bg-white px-4 py-3 outline-none transition focus:border-[#1f5f5b]"
          required
        />
      </label>

      <label className="grid gap-2 text-sm font-medium text-stone-700">
        Qual objetivo de estudo voce quer alcancar neste momento?
        <textarea
          value={formData.studyGoal}
          onChange={(event) => updateField("studyGoal", event.target.value)}
          placeholder="Conte o que voce gostaria de desenvolver com ajuda da plataforma."
          className="min-h-28 rounded-2xl border border-stone-300 bg-white px-4 py-3 outline-none transition focus:border-[#1f5f5b]"
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
          className="rounded-full bg-[#1f5f5b] px-5 py-3 text-sm font-semibold text-white"
        >
          Continuar para o ambiente do aluno
        </button>
      </div>
    </form>
  );
}