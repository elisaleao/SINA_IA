"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { ChatPanel } from "@/components/workspace/ChatPanel";
import { getRegistration } from "@/lib/auth-storage";
import {
  getStudentClassrooms,
  joinClassroomByCode,
  subscribeToClassrooms,
  type StoredClassroom,
  type StoredClassroomFile,
} from "@/lib/classrooms-storage";
import { appRoutes } from "@/lib/routes";
import { generateStudyContent, getAudioUrl, type GenerationType } from "@/lib/api";

type StudentView = "chat" | "schedule" | "join-room" | "room";

type ScheduleConfig = {
  dayStart: string;
  classDuration: number;
  breakDuration: number;
  periodsPerDay: number;
};

type StudentRoom = StoredClassroom;

type StudentProfile = {
  email: string;
};

const weekdayLabels = ["Seg", "Ter", "Qua", "Qui", "Sex"];

const initialScheduleConfig: ScheduleConfig = {
  dayStart: "07:00",
  classDuration: 50,
  breakDuration: 10,
  periodsPerDay: 5,
};

function createEmptySubjects(periodsPerDay: number) {
  return weekdayLabels.map(() => Array.from({ length: periodsPerDay }, () => ""));
}

function convertTimeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (totalMinutes % 60).toString().padStart(2, "0");

  return `${hours}:${minutes}`;
}

function buildTimeSlots(config: ScheduleConfig) {
  const startMinutes = convertTimeToMinutes(config.dayStart);

  return Array.from({ length: config.periodsPerDay }, (_, index) => {
    const periodStart =
      startMinutes + index * (config.classDuration + config.breakDuration);
    const periodEnd = periodStart + config.classDuration;

    return {
      label: `${index + 1}a aula`,
      range: `${formatMinutes(periodStart)} - ${formatMinutes(periodEnd)}`,
    };
  });
}

function findNextScheduledEvent(
  subjectsByDay: string[][],
  timeSlots: ReturnType<typeof buildTimeSlots>,
) {
  const now = new Date();
  const currentDay = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const weekdayToCalendarDay = [1, 2, 3, 4, 5];

  for (let offset = 0; offset < 7; offset += 1) {
    const calendarDay = ((currentDay + offset - 1 + 7) % 7) + 1;
    const weekdayIndex = weekdayToCalendarDay.indexOf(calendarDay);

    if (weekdayIndex === -1) {
      continue;
    }

    const daySubjects = subjectsByDay[weekdayIndex] ?? [];

    for (let slotIndex = 0; slotIndex < daySubjects.length; slotIndex += 1) {
      const subject = daySubjects[slotIndex]?.trim();

      if (!subject) {
        continue;
      }

      const slot = timeSlots[slotIndex];

      if (!slot) {
        continue;
      }

      const slotStart = convertTimeToMinutes(slot.range.split(" - ")[0]);

      if (offset === 0 && slotStart <= currentMinutes) {
        continue;
      }

      return {
        dayLabel: weekdayLabels[weekdayIndex],
        subject,
        timeRange: slot.range,
      };
    }
  }

  return null;
}

function PencilIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  );
}

export function StudentWorkspace() {
  const sidebarId = "student-workspace-sidebar";
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState<StudentView>("chat");
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [studentRooms, setStudentRooms] = useState<StudentRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<StudentRoom | null>(null);
  const [isEditingSchedule, setIsEditingSchedule] = useState(true);
  const [hasConfirmedSchedule, setHasConfirmedSchedule] = useState(false);
  const [scheduleConfig, setScheduleConfig] =
    useState<ScheduleConfig>(initialScheduleConfig);
  const [subjectsByDay, setSubjectsByDay] = useState<string[][]>(() =>
    createEmptySubjects(initialScheduleConfig.periodsPerDay),
  );
  const [joinRoomCode, setJoinRoomCode] = useState("");
  const [joinFeedback, setJoinFeedback] = useState<string | null>(null);
  
  const [selectedFileForStudy, setSelectedFileForStudy] = useState<StoredClassroomFile | null>(null);
  const [adaptationType, setAdaptationType] = useState<GenerationType>("summary");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<{
    text: string;
    audioUrl: string | null;
  } | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const timeSlots = useMemo(
    () => buildTimeSlots(scheduleConfig),
    [scheduleConfig],
  );
  const nextScheduledEvent = useMemo(
    () => findNextScheduledEvent(subjectsByDay, timeSlots),
    [subjectsByDay, timeSlots],
  );
  const mainChatMessages: Array<{
    id: string;
    author: string;
    body: string;
    tone: "assistant" | "user";
  }> = [];
  const roomChatMessages = selectedRoom
    ? ([] as Array<{
        id: string;
        author: string;
        body: string;
        tone: "assistant" | "user";
      }>)
    : [];

  const syncStudentRooms = useCallback(() => {
    const registration = getRegistration("student");

    if (!registration || registration.role !== "student") {
      setStudentProfile(null);
      setStudentRooms([]);
      setSelectedRoom(null);
      return;
    }

    setStudentProfile({ email: registration.email });

    const nextRooms = getStudentClassrooms(registration.email);
    setStudentRooms(nextRooms);
    setSelectedRoom((current) => {
      if (!current) {
        return null;
      }

      const nextSelectedRoom = nextRooms.find((room) => room.id === current.id) ?? null;

      if (!nextSelectedRoom) {
        setActiveView("chat");
      }

      return nextSelectedRoom;
    });
  }, []);

  useEffect(() => {
    const syncHandle = window.setTimeout(syncStudentRooms, 0);
    const unsubscribe = subscribeToClassrooms(syncStudentRooms);

    return () => {
      window.clearTimeout(syncHandle);
      unsubscribe();
    };
  }, [syncStudentRooms]);

  function updateScheduleConfig<Key extends keyof ScheduleConfig>(
    key: Key,
    value: ScheduleConfig[Key],
  ) {
    setScheduleConfig((current) => {
      const nextConfig = { ...current, [key]: value };

      if (key === "periodsPerDay") {
        const nextPeriodsPerDay = Number(value);
        setSubjectsByDay((currentSubjects) =>
          currentSubjects.map((daySubjects) => {
            if (daySubjects.length === nextPeriodsPerDay) {
              return daySubjects;
            }

            if (daySubjects.length > nextPeriodsPerDay) {
              return daySubjects.slice(0, nextPeriodsPerDay);
            }

            return [
              ...daySubjects,
              ...Array.from(
                { length: nextPeriodsPerDay - daySubjects.length },
                () => "",
              ),
            ];
          }),
        );
      }

      return nextConfig;
    });
  }

  function updateSubject(dayIndex: number, periodIndex: number, value: string) {
    setSubjectsByDay((current) =>
      current.map((daySubjects, currentDayIndex) => {
        if (currentDayIndex !== dayIndex) {
          return daySubjects;
        }

        return daySubjects.map((subject, currentPeriodIndex) =>
          currentPeriodIndex === periodIndex ? value : subject,
        );
      }),
    );
  }

  function confirmSchedule() {
    setHasConfirmedSchedule(true);
    setIsEditingSchedule(false);
    setActiveView("chat");
    setJoinFeedback(null);
  }

  function openScheduleEditor() {
    setActiveView("schedule");
    setIsEditingSchedule(true);
    setJoinFeedback(null);
  }

  function openJoinRoom() {
    setSelectedRoom(null);
    setSelectedFileForStudy(null);
    setGeneratedContent(null);
    setGenerationError(null);
    setActiveView("join-room");
    setJoinFeedback(null);
  }

  function openRoom(room: StudentRoom) {
    setSelectedRoom(room);
    setSelectedFileForStudy(null);
    setGeneratedContent(null);
    setGenerationError(null);
    setActiveView("room");
    setJoinFeedback(null);
  }

  function goBackToMainChat() {
    setSelectedRoom(null);
    setSelectedFileForStudy(null);
    setGeneratedContent(null);
    setGenerationError(null);
    setActiveView("chat");
    setJoinFeedback(null);
  }

  async function handleGenerateContent(type: GenerationType) {
    if (!selectedFileForStudy?.documentId) {
      setGenerationError("Este arquivo não possui um ID de documento válido no back-end. Certifique-se de que ele foi enviado corretamente pelo professor.");
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    setAdaptationType(type);

    try {
      const response = await generateStudyContent({
        document_id: selectedFileForStudy.documentId,
        generation_type: type,
        teacher_config: {
          pedagogical_level: "intermediario",
          math_detail_level: "passo_a_passo",
          tone: "encorajador",
        },
        generate_audio: true,
      });

      setGeneratedContent({
        text: response.text_content,
        audioUrl: response.audio_url,
      });
    } catch (error: any) {
      console.error(error);
      setGenerationError(error.message || "Erro ao conectar com o servidor para gerar o material.");
    } finally {
      setIsGenerating(false);
    }
  }

  function handleJoinRoom(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!studentProfile) {
      setJoinFeedback("Finalize o cadastro do aluno antes de entrar em uma sala.");
      return;
    }

    const result = joinClassroomByCode(studentProfile.email, joinRoomCode);

    if (result.status === "invalid-code") {
      setJoinFeedback("Codigo invalido ou expirado. Confira o identificador enviado pelo professor.");
      return;
    }

    if (result.status === "already-joined") {
      setSelectedRoom(result.room);
      setActiveView("room");
      setJoinFeedback("Voce ja participa desta sala.");
      syncStudentRooms();
      return;
    }

    setJoinRoomCode("");
    setSelectedRoom(result.room);
    setActiveView("room");
    setJoinFeedback("Sala adicionada com sucesso ao seu menu lateral.");
    syncStudentRooms();
  }

  return (
    <main className="h-[calc(100vh-81px)] w-full overflow-hidden" aria-label="Ambiente do aluno">
      <section
        className={`grid h-full w-full flex-1 overflow-hidden transition-[grid-template-columns] duration-300 ${
          isSidebarOpen
            ? "lg:grid-cols-[340px_minmax(0,1fr)]"
            : "lg:grid-cols-[72px_minmax(0,1fr)]"
        }`}
      >
        <aside
          id={sidebarId}
          aria-label="Menu lateral do aluno"
          className="flex h-full flex-col overflow-hidden border-r border-stone-200 bg-white px-3 py-4 shadow-[18px_0_40px_-32px_rgba(0,0,0,0.22)]"
        >
          <div className="flex items-center justify-end pb-3">
            <button
              type="button"
              onClick={() => setIsSidebarOpen((current) => !current)}
              aria-label={isSidebarOpen ? "Recolher menu lateral" : "Expandir menu lateral"}
              aria-expanded={isSidebarOpen}
              aria-controls={sidebarId}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-stone-300 text-stone-700 transition hover:border-stone-900 hover:text-stone-900"
            >
              <span className="flex flex-col gap-[3px]" aria-hidden="true">
                <span className="block h-[2px] w-4 rounded-full bg-current" />
                <span className="block h-[2px] w-4 rounded-full bg-current" />
                <span className="block h-[2px] w-4 rounded-full bg-current" />
              </span>
            </button>
          </div>

          {isSidebarOpen ? (
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <div className="grid gap-5">
                <section className="grid gap-3">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">
                    Proximo evento
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveView("schedule")}
                    aria-pressed={activeView === "schedule"}
                    className={`rounded-[1.25rem] border px-4 py-4 text-left transition ${
                      activeView === "schedule"
                        ? "border-[#1f5f5b] bg-[#edf6f5]"
                        : "border-stone-200 bg-[#fffaf1] hover:border-stone-300"
                    }`}
                  >
                    {hasConfirmedSchedule && nextScheduledEvent ? (
                      <>
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-stone-900">
                            {nextScheduledEvent.subject}
                          </p>
                          <span className="rounded-full bg-[#1f5f5b]/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#1f5f5b]">
                            Lembrete
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-stone-600">
                          {nextScheduledEvent.dayLabel} • {nextScheduledEvent.timeRange}
                        </p>
                        <p className="mt-3 text-sm leading-6 text-stone-500">
                          Clique para visualizar o quadro de horarios completo.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-stone-900">
                          Nenhum evento marcado
                        </p>
                        <p className="mt-2 text-sm leading-6 text-stone-600">
                          Monte o quadro de horarios para acompanhar aqui o proximo compromisso da semana.
                        </p>
                      </>
                    )}
                  </button>
                </section>

                <section className="grid gap-3">
                  <button
                    type="button"
                    onClick={openJoinRoom}
                    aria-pressed={activeView === "join-room"}
                    className={`rounded-[1.25rem] border px-4 py-4 text-left transition ${
                      activeView === "join-room"
                        ? "border-[#1f5f5b] bg-[#edf6f5]"
                        : "border-stone-200 bg-[#fffaf1] hover:border-stone-300"
                    }`}
                  >
                    <p className="text-sm font-semibold text-stone-900">
                      Ingressar em nova sala
                    </p>
                    <p className="mt-2 text-sm leading-6 text-stone-600">
                      Digite o codigo enviado pelo professor para liberar o acesso a uma turma.
                    </p>
                  </button>

                  <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">
                    Salas de aula
                  </h2>
                  {studentRooms.length > 0 ? (
                    <div className="grid gap-3">
                      {studentRooms.map((room) => (
                        <button
                          key={room.id}
                          type="button"
                          onClick={() => openRoom(room)}
                          aria-pressed={activeView === "room" && selectedRoom?.id === room.id}
                          className={`rounded-[1.25rem] border px-4 py-4 text-left transition ${
                            activeView === "room" && selectedRoom?.id === room.id
                              ? "border-[#1f5f5b] bg-[#edf6f5]"
                              : "border-stone-200 bg-[#fffaf1] hover:border-stone-300"
                          }`}
                        >
                          <h3 className="text-sm font-semibold text-stone-900">
                            {room.title}
                          </h3>
                          <p className="mt-2 text-sm leading-6 text-stone-600">
                            {room.description}
                          </p>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </section>
              </div>
            </div>
          ) : null}
        </aside>

        <section className="grid h-full overflow-hidden">
          {activeView === "chat" ? (
            <ChatPanel
              key="student-main-chat"
              title="Chat principal"
              messages={mainChatMessages}
              placeholder="Escreva sua mensagem"
            />
          ) : activeView === "join-room" ? (
            <div className="grid h-full overflow-auto bg-white p-6 sm:p-8">
              <div className="mx-auto grid w-full max-w-3xl gap-6">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#1f5f5b]">
                    Nova sala
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
                    Entre em uma sala de aula com o codigo do professor
                  </h2>
                  <p className="mt-3 max-w-2xl text-base leading-7 text-stone-600">
                    O acesso so funciona com o identificador valido e atualizado pelo professor responsavel pela turma.
                  </p>
                </div>

                <form
                  onSubmit={handleJoinRoom}
                  className="grid gap-5 rounded-[2rem] border border-stone-200 bg-[#f8fbfa] p-6 shadow-[0_18px_40px_-28px_rgba(0,0,0,0.2)]"
                >
                  <label className="grid gap-2 text-sm font-medium text-stone-700">
                    Codigo da sala
                    <input
                      type="text"
                      value={joinRoomCode}
                      onChange={(event) => setJoinRoomCode(event.target.value.toUpperCase())}
                      placeholder="ABCD-EFGH"
                      className="rounded-2xl border border-stone-300 bg-white px-4 py-3 uppercase outline-none transition focus:border-[#1f5f5b]"
                      required
                    />
                  </label>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="submit"
                      className="rounded-full bg-[#1f5f5b] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#184946]"
                    >
                      Entrar na sala
                    </button>
                    <button
                      type="button"
                      onClick={goBackToMainChat}
                      className="rounded-full border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-700 transition hover:border-stone-900 hover:text-stone-900"
                    >
                      Cancelar
                    </button>
                  </div>

                  {joinFeedback ? (
                    <p role="status" aria-live="polite" className="text-sm leading-6 text-[#1f5f5b]">{joinFeedback}</p>
                  ) : null}
                </form>
              </div>
            </div>
          ) : activeView === "room" && selectedRoom ? (
            <div className="grid h-full gap-4 overflow-hidden lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
                <div className="border-b border-stone-200 bg-white px-4 py-3 sm:px-5">
                  <div className="mx-auto flex max-w-4xl items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedFileForStudy) {
                          setSelectedFileForStudy(null);
                          setGeneratedContent(null);
                          setGenerationError(null);
                        } else {
                          goBackToMainChat();
                        }
                      }}
                      className="inline-flex items-center gap-2 rounded-full border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-900 hover:text-stone-900"
                    >
                      <ArrowLeftIcon />
                      {selectedFileForStudy ? "Voltar ao chat da sala" : "Voltar ao chat principal"}
                    </button>
                    <span className="text-sm font-medium text-stone-500">
                      {selectedRoom.title}{selectedFileForStudy ? ` • Estudo: ${selectedFileForStudy.title}` : ""}
                    </span>
                  </div>
                </div>

                {selectedFileForStudy ? (
                  <div className="min-h-0 overflow-y-auto bg-[#faf8f4] p-5 sm:p-6" role="region" aria-label={`Estudo adaptado do arquivo ${selectedFileForStudy.title}`}>
                    <div className="mx-auto max-w-3xl space-y-6">
                      <div className="rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
                        <span className="rounded-full bg-[#1f5f5b]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#1f5f5b]">
                          Material de Estudo Adaptado por IA
                        </span>
                        <h3 className="mt-2 text-xl font-bold text-stone-900">{selectedFileForStudy.title}</h3>
                        <p className="mt-1 text-sm text-stone-500">{selectedFileForStudy.meta}</p>

                        {!selectedFileForStudy.documentId ? (
                          <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
                            <strong>Aviso:</strong> Este arquivo foi adicionado antes da ativação do back-end. Não possui ID de documento para gerar o resumo/áudio via IA. Peça para o professor reenviá-lo.
                          </div>
                        ) : (
                          <div className="mt-5 space-y-4">
                            <p className="text-sm font-semibold text-stone-700">Selecione o formato de estudo para gerar com a IA:</p>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => handleGenerateContent("summary")}
                                disabled={isGenerating}
                                className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                                  adaptationType === "summary" && generatedContent
                                    ? "bg-[#1f5f5b] text-white"
                                    : "bg-white border border-stone-300 text-stone-700 hover:border-stone-850 hover:bg-stone-50"
                                }`}
                              >
                                {isGenerating && adaptationType === "summary" ? "Gerando Resumo..." : "Resumo Adaptado"}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleGenerateContent("quiz")}
                                disabled={isGenerating}
                                className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                                  adaptationType === "quiz" && generatedContent
                                    ? "bg-[#1f5f5b] text-white"
                                    : "bg-white border border-stone-300 text-stone-700 hover:border-stone-850 hover:bg-stone-50"
                                }`}
                              >
                                {isGenerating && adaptationType === "quiz" ? "Gerando Questões..." : "Questões de Fixação"}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleGenerateContent("study_guide")}
                                disabled={isGenerating}
                                className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                                  adaptationType === "study_guide" && generatedContent
                                    ? "bg-[#1f5f5b] text-white"
                                    : "bg-white border border-stone-300 text-stone-700 hover:border-stone-850 hover:bg-stone-50"
                                }`}
                              >
                                {isGenerating && adaptationType === "study_guide" ? "Gerando Guia..." : "Guia de Estudos"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {isGenerating && (
                        <div className="flex flex-col items-center justify-center p-12 space-y-4 rounded-[1.5rem] bg-white border border-stone-200">
                          <div className="w-10 h-10 border-4 border-[#1f5f5b] border-t-transparent rounded-full animate-spin"></div>
                          <p className="text-sm font-medium text-stone-600">A IA está processando seu material de forma acessível...</p>
                        </div>
                      )}

                      {generationError && (
                        <div className="rounded-[1.5rem] bg-red-50 border border-red-200 p-5 text-sm text-red-800" role="alert">
                          <strong>Erro:</strong> {generationError}
                        </div>
                      )}

                      {generatedContent && !isGenerating && (
                        <div className="space-y-6">
                          {generatedContent.audioUrl && (
                            <div className="rounded-[1.5rem] border border-[#1f5f5b]/20 bg-[#edf6f5] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                              <p className="text-sm font-bold text-[#1f5f5b] uppercase tracking-[0.16em]">
                                Versão Falada com Fórmulas Adaptadas
                              </p>
                              <p className="mt-1 text-xs text-stone-600">
                                Play para ouvir a explicação da IA. As equações matemáticas foram traduzidas foneticamente.
                              </p>
                              <div className="mt-4 flex items-center">
                                <audio
                                  src={getAudioUrl(generatedContent.audioUrl) || undefined}
                                  controls
                                  className="w-full"
                                  aria-label="Reprodutor do áudio explicativo adaptado por IA"
                                />
                              </div>
                            </div>
                          )}

                          <div className="rounded-[1.5rem] border border-stone-200 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                            <h4 className="text-lg font-bold text-stone-900 border-b border-stone-200 pb-3 uppercase tracking-wider">
                              Conteúdo Escrito ({adaptationType === "summary" ? "Resumo" : adaptationType === "quiz" ? "Questões" : "Guia de Estudos"})
                            </h4>
                            <div className="mt-4 text-stone-800 leading-relaxed whitespace-pre-wrap text-base font-sans space-y-4">
                              {generatedContent.text}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <ChatPanel
                    key={`room-chat-${selectedRoom.id}`}
                    title={selectedRoom.title}
                    messages={roomChatMessages}
                    placeholder="Escreva sua mensagem para a sala"
                  />
                )}
              </div>

              <aside aria-label="Materiais da sala" className="min-h-0 overflow-y-auto border-l border-stone-200 bg-white p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#b05a2b]">
                      Arquivos
                    </p>
                    <h3 className="mt-2 text-xl font-semibold tracking-tight text-stone-900">
                      Materiais do professor
                    </h3>
                  </div>
                </div>

                <div className="mt-5 grid gap-3">
                  {selectedRoom.files.length > 0 ? (
                    selectedRoom.files.map((file) => (
                      <button
                        key={file.id}
                        type="button"
                        onClick={() => {
                          setSelectedFileForStudy(file);
                          setGeneratedContent(null);
                          setGenerationError(null);
                        }}
                        className={`rounded-[1.25rem] border text-left px-4 py-4 transition ${
                          selectedFileForStudy?.id === file.id
                            ? "border-[#1f5f5b] bg-[#edf6f5]"
                            : "border-stone-200 bg-[#fffaf1] hover:border-stone-300"
                        }`}
                      >
                        <h4 className="text-sm font-semibold text-stone-900">
                          {file.title}
                        </h4>
                        <p className="mt-2 text-sm leading-6 text-stone-600">
                          {file.meta}
                        </p>
                      </button>
                    ))
                  ) : (
                    <div className="rounded-[1.25rem] border border-dashed border-stone-300 px-4 py-5 text-sm leading-6 text-stone-500">
                      Nenhum arquivo foi disponibilizado pelo professor nesta sala ainda.
                    </div>
                  )}
                </div>
              </aside>
            </div>
          ) : (
            <div className="grid h-full gap-4 overflow-hidden bg-white p-6 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#1f5f5b]">
                    Quadro de horarios
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
                    Organize suas aulas da semana
                  </h2>
                  <p className="mt-3 max-w-3xl text-base leading-7 text-stone-600">
                    Defina o inicio do dia, a duracao das aulas, o intervalo entre elas e preencha as materias de cada dia da semana.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {hasConfirmedSchedule ? (
                    <button
                      type="button"
                      onClick={openScheduleEditor}
                      className="inline-flex items-center gap-2 rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-900 hover:text-stone-900"
                    >
                      <PencilIcon />
                      Editar quadro
                    </button>
                  ) : null}
                  <Link
                    href={appRoutes.home}
                    className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-900 hover:text-stone-900"
                  >
                    Voltar ao inicio
                  </Link>
                </div>
              </div>

              {hasConfirmedSchedule && !isEditingSchedule ? (
                <div className="grid min-h-0 gap-4 overflow-auto">
                  <div className="grid gap-4 rounded-[1.5rem] bg-[#f8fbfa] p-5">
                    <div className="flex flex-wrap gap-3 text-sm text-stone-600">
                      <span className="rounded-full bg-white px-3 py-2">
                        Inicio: {scheduleConfig.dayStart}
                      </span>
                      <span className="rounded-full bg-white px-3 py-2">
                        Aula: {scheduleConfig.classDuration} min
                      </span>
                      <span className="rounded-full bg-white px-3 py-2">
                        Intervalo: {scheduleConfig.breakDuration} min
                      </span>
                    </div>

                    <div className="overflow-auto rounded-[1.5rem] border border-stone-200 bg-white">
                      <div className="grid min-w-[760px] grid-cols-[120px_repeat(5,minmax(0,1fr))]">
                        <div className="border-b border-r border-stone-200 bg-stone-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                          Horario
                        </div>
                        {weekdayLabels.map((day) => (
                          <div
                            key={day}
                            className="border-b border-r border-stone-200 bg-stone-50 px-4 py-3 text-sm font-semibold text-stone-800 last:border-r-0"
                          >
                            {day}
                          </div>
                        ))}

                        {timeSlots.map((slot, slotIndex) => (
                          <>
                            <div
                              key={`${slot.label}-time`}
                              className="border-b border-r border-stone-200 px-4 py-4 text-sm text-stone-600"
                            >
                              <p className="font-semibold text-stone-800">{slot.label}</p>
                              <p className="mt-1 text-xs uppercase tracking-[0.15em] text-stone-500">
                                {slot.range}
                              </p>
                            </div>
                            {weekdayLabels.map((day, dayIndex) => (
                              <div
                                key={`${day}-${slot.label}-subject`}
                                className="border-b border-r border-stone-200 px-4 py-4 text-sm text-stone-700 last:border-r-0"
                              >
                                {subjectsByDay[dayIndex][slotIndex] || "Sem aula definida"}
                              </div>
                            ))}
                          </>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid min-h-0 gap-6 overflow-auto pr-1">
                  <section className="grid gap-4 rounded-[1.5rem] bg-[#f8fbfa] p-5">
                    <h3 className="text-lg font-semibold text-stone-900">
                      Configuracao de horario
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <label className="grid gap-2 text-sm font-medium text-stone-700">
                        Inicio do dia
                        <input
                          type="time"
                          value={scheduleConfig.dayStart}
                          onChange={(event) =>
                            updateScheduleConfig("dayStart", event.target.value)
                          }
                          className="rounded-2xl border border-stone-300 bg-white px-4 py-3 outline-none transition focus:border-[#1f5f5b]"
                        />
                      </label>
                      <label className="grid gap-2 text-sm font-medium text-stone-700">
                        Duracao da aula
                        <input
                          type="number"
                          min={30}
                          max={120}
                          step={5}
                          value={scheduleConfig.classDuration}
                          onChange={(event) =>
                            updateScheduleConfig(
                              "classDuration",
                              Number(event.target.value),
                            )
                          }
                          className="rounded-2xl border border-stone-300 bg-white px-4 py-3 outline-none transition focus:border-[#1f5f5b]"
                        />
                      </label>
                      <label className="grid gap-2 text-sm font-medium text-stone-700">
                        Intervalo entre aulas
                        <input
                          type="number"
                          min={0}
                          max={60}
                          step={5}
                          value={scheduleConfig.breakDuration}
                          onChange={(event) =>
                            updateScheduleConfig(
                              "breakDuration",
                              Number(event.target.value),
                            )
                          }
                          className="rounded-2xl border border-stone-300 bg-white px-4 py-3 outline-none transition focus:border-[#1f5f5b]"
                        />
                      </label>
                      <label className="grid gap-2 text-sm font-medium text-stone-700">
                        Aulas por dia
                        <input
                          type="number"
                          min={1}
                          max={8}
                          value={scheduleConfig.periodsPerDay}
                          onChange={(event) =>
                            updateScheduleConfig(
                              "periodsPerDay",
                              Number(event.target.value),
                            )
                          }
                          className="rounded-2xl border border-stone-300 bg-white px-4 py-3 outline-none transition focus:border-[#1f5f5b]"
                        />
                      </label>
                    </div>
                  </section>

                  <section className="grid gap-4 rounded-[1.5rem] border border-stone-200 bg-white p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-lg font-semibold text-stone-900">
                        Aulas da semana
                      </h3>
                      <p className="text-sm text-stone-500">
                        Preencha as materias previstas para cada dia e horario.
                      </p>
                    </div>

                    <div className="overflow-auto rounded-[1.5rem] border border-stone-200">
                      <div className="grid min-w-[920px] grid-cols-[120px_repeat(5,minmax(0,1fr))]">
                        <div className="border-b border-r border-stone-200 bg-stone-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                          Horario
                        </div>
                        {weekdayLabels.map((day) => (
                          <div
                            key={day}
                            className="border-b border-r border-stone-200 bg-stone-50 px-4 py-3 text-sm font-semibold text-stone-800 last:border-r-0"
                          >
                            {day}
                          </div>
                        ))}

                        {timeSlots.map((slot, slotIndex) => (
                          <>
                            <div
                              key={`${slot.label}-editor`}
                              className="border-b border-r border-stone-200 bg-stone-50/60 px-4 py-4 text-sm text-stone-600"
                            >
                              <p className="font-semibold text-stone-800">{slot.label}</p>
                              <p className="mt-1 text-xs uppercase tracking-[0.15em] text-stone-500">
                                {slot.range}
                              </p>
                            </div>
                            {weekdayLabels.map((day, dayIndex) => (
                              <label
                                key={`${day}-${slot.label}-input`}
                                className="border-b border-r border-stone-200 bg-white px-3 py-3 last:border-r-0"
                              >
                                <span className="sr-only">
                                  {`${day}, ${slot.label}`}
                                </span>
                                <input
                                  type="text"
                                  value={subjectsByDay[dayIndex][slotIndex]}
                                  onChange={(event) =>
                                    updateSubject(
                                      dayIndex,
                                      slotIndex,
                                      event.target.value,
                                    )
                                  }
                                  placeholder="Materia"
                                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm outline-none transition focus:border-[#1f5f5b]"
                                />
                              </label>
                            ))}
                          </>
                        ))}
                      </div>
                    </div>
                  </section>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={confirmSchedule}
                      className="rounded-full bg-[#1f5f5b] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#184946]"
                    >
                      Confirmar quadro de horarios
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}