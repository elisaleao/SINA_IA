"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ChatPanel } from "@/components/workspace/ChatPanel";
import { getRegistration } from "@/lib/auth-storage";
import {
  addClassroomFiles,
  createClassroom,
  getTeacherClassrooms,
  refreshClassroomAccessCode,
  subscribeToClassrooms,
  type StoredClassroom,
} from "@/lib/classrooms-storage";
import { uploadDocument } from "@/lib/api";

type TeacherView = "chat" | "create-room" | "room";
type TeacherRoom = StoredClassroom;

type TeacherProfile = {
  fullName: string;
  email: string;
};

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

export function TeacherWorkspace() {
  const sidebarId = "teacher-workspace-sidebar";
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState<TeacherView>("chat");
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);
  const [teacherRooms, setTeacherRooms] = useState<TeacherRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<TeacherRoom | null>(null);
  const [roomFormData, setRoomFormData] = useState({
    title: "",
    description: "",
  });
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const syncTeacherRooms = useCallback(() => {
    const registration = getRegistration("teacher");

    if (!registration || registration.role !== "teacher") {
      setTeacherProfile(null);
      setTeacherRooms([]);
      setSelectedRoom(null);
      return;
    }

    setTeacherProfile({
      fullName: registration.fullName,
      email: registration.email,
    });

    const nextRooms = getTeacherClassrooms(registration.email);
    setTeacherRooms(nextRooms);
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
    const syncHandle = window.setTimeout(syncTeacherRooms, 0);
    const unsubscribe = subscribeToClassrooms(syncTeacherRooms);

    return () => {
      window.clearTimeout(syncHandle);
      unsubscribe();
    };
  }, [syncTeacherRooms]);

  function openRoom(room: TeacherRoom) {
    setSelectedRoom(room);
    setActiveView("room");
    setFeedbackMessage(null);
  }

  function goBackToMainChat() {
    setSelectedRoom(null);
    setActiveView("chat");
    setFeedbackMessage(null);
  }

  function openCreateRoom() {
    setSelectedRoom(null);
    setActiveView("create-room");
    setFeedbackMessage(null);
  }

  function updateRoomField(field: "title" | "description", value: string) {
    setRoomFormData((current) => ({ ...current, [field]: value }));
  }

  function handleCreateRoom(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!teacherProfile) {
      setFeedbackMessage("Finalize o cadastro do professor antes de criar uma sala.");
      return;
    }

    const classroom = createClassroom({
      title: roomFormData.title,
      description: roomFormData.description,
      teacherName: teacherProfile.fullName,
      teacherEmail: teacherProfile.email,
    });

    setRoomFormData({ title: "", description: "" });
    setSelectedRoom(classroom);
    setActiveView("room");
    setFeedbackMessage("Sala criada com codigo de acesso valido pelas proximas 24 horas.");
    syncTeacherRooms();
  }

  function handleRefreshCode() {
    if (!selectedRoom || !teacherProfile) {
      return;
    }

    const refreshedRoom = refreshClassroomAccessCode(
      selectedRoom.id,
      teacherProfile.email,
    );

    if (!refreshedRoom) {
      return;
    }

    setSelectedRoom(refreshedRoom);
    setFeedbackMessage("Codigo de acesso renovado por mais 24 horas.");
    syncTeacherRooms();
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  async function handleImportDocuments(event: React.ChangeEvent<HTMLInputElement>) {
    if (!selectedRoom || !teacherProfile) {
      return;
    }

    const selectedFiles = Array.from(event.target.files ?? []);

    if (selectedFiles.length === 0) {
      return;
    }

    setFeedbackMessage("Enviando e processando documento na IA... Por favor, aguarde.");

    try {
      const formatter = new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      });

      const importedFiles = [];

      for (const file of selectedFiles) {
        // Envia o arquivo para a API FastAPI
        const response = await uploadDocument(file);
        
        importedFiles.push({
          id: `file-${response.document_id}`,
          title: file.name,
          meta: `${file.type || "Arquivo"} • ${(file.size / 1024).toFixed(1)} KB • Importado em ${formatter.format(new Date())}`,
          documentId: response.document_id,
          extractedMarkdown: response.extracted_markdown,
          accessibleText: response.accessible_text,
          equationsFound: response.equations_found,
        });
      }

      const updatedRoom = addClassroomFiles(
        selectedRoom.id,
        teacherProfile.email,
        importedFiles,
      );

      if (updatedRoom) {
        setSelectedRoom(updatedRoom);
        setFeedbackMessage("Documentos importados e processados com sucesso!");
        syncTeacherRooms();
      }
    } catch (error: any) {
      console.error(error);
      setFeedbackMessage(`Erro ao importar documento: ${error.message || "Erro desconhecido. Verifique se o backend está ativo."}`);
    } finally {
      event.target.value = "";
    }
  }

  const formattedExpiry = selectedRoom
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(selectedRoom.accessCodeExpiresAt))
    : null;

  return (
    <main className="h-[calc(100vh-81px)] w-full overflow-hidden" aria-label="Ambiente do professor">
      <section
        className={`grid h-full w-full flex-1 overflow-hidden transition-[grid-template-columns] duration-300 ${
          isSidebarOpen
            ? "lg:grid-cols-[340px_minmax(0,1fr)]"
            : "lg:grid-cols-[72px_minmax(0,1fr)]"
        }`}
      >
        <aside
          id={sidebarId}
          aria-label="Menu lateral do professor"
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
                  <button
                    type="button"
                    onClick={openCreateRoom}
                    aria-pressed={activeView === "create-room"}
                    className={`rounded-[1.25rem] border px-4 py-4 text-left transition ${
                      activeView === "create-room"
                        ? "border-[#b05a2b] bg-[#fff3ea]"
                        : "border-stone-200 bg-[#fffaf1] hover:border-stone-300"
                    }`}
                  >
                    <p className="text-sm font-semibold text-stone-900">
                      Adicionar sala de aula
                    </p>
                    <p className="mt-2 text-sm leading-6 text-stone-600">
                      Crie uma turma, gere um codigo temporario e acompanhe os alunos vinculados.
                    </p>
                  </button>

                  <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">
                    Salas de aula
                  </h2>
                  {teacherRooms.length > 0 ? (
                    <div className="grid gap-3">
                      {teacherRooms.map((room) => (
                        <button
                          key={room.id}
                          type="button"
                          onClick={() => openRoom(room)}
                          aria-pressed={activeView === "room" && selectedRoom?.id === room.id}
                          className={`rounded-[1.25rem] border px-4 py-4 text-left transition ${
                            activeView === "room" && selectedRoom?.id === room.id
                              ? "border-[#b05a2b] bg-[#fff3ea]"
                              : "border-stone-200 bg-[#fffaf1] hover:border-stone-300"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="text-sm font-semibold text-stone-900">
                              {room.title}
                            </h3>
                            <span className="rounded-full bg-stone-900 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-white">
                              {room.studentEmails.length} alunos
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-stone-600">
                            {room.description}
                          </p>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[1.25rem] border border-dashed border-stone-300 px-4 py-5 text-sm leading-6 text-stone-500">
                      Nenhuma sala criada ainda. Use a opcao acima para abrir a primeira turma.
                    </div>
                  )}
                </section>
              </div>
            </div>
          ) : null}
        </aside>

        <section className="grid h-full overflow-hidden">
          {activeView === "chat" ? (
            <ChatPanel
              key="teacher-main-chat"
              title="Chat principal"
              messages={mainChatMessages}
              placeholder="Escreva sua mensagem"
            />
          ) : activeView === "create-room" ? (
            <div className="grid h-full overflow-auto bg-white p-6 sm:p-8">
              <div className="mx-auto grid w-full max-w-3xl gap-6">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#b05a2b]">
                    Nova sala
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
                    Configure a sala de aula e gere um codigo temporario
                  </h2>
                  <p className="mt-3 max-w-2xl text-base leading-7 text-stone-600">
                    O codigo criado fica ativo por 24 horas e pode ser renovado depois dentro da propria sala.
                  </p>
                </div>

                <form
                  onSubmit={handleCreateRoom}
                  className="grid gap-5 rounded-[2rem] border border-stone-200 bg-[#fffaf1] p-6 shadow-[0_18px_40px_-28px_rgba(0,0,0,0.2)]"
                >
                  <label className="grid gap-2 text-sm font-medium text-stone-700">
                    Nome da sala
                    <input
                      type="text"
                      value={roomFormData.title}
                      onChange={(event) => updateRoomField("title", event.target.value)}
                      placeholder="Ex.: 2B - Matematica"
                      className="rounded-2xl border border-stone-300 bg-white px-4 py-3 outline-none transition focus:border-[#b05a2b]"
                      required
                    />
                  </label>

                  <label className="grid gap-2 text-sm font-medium text-stone-700">
                    Descricao da sala
                    <textarea
                      value={roomFormData.description}
                      onChange={(event) => updateRoomField("description", event.target.value)}
                      placeholder="Explique rapidamente para que a turma sera usada."
                      className="min-h-32 rounded-2xl border border-stone-300 bg-white px-4 py-3 outline-none transition focus:border-[#b05a2b]"
                      required
                    />
                  </label>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="submit"
                      className="rounded-full bg-[#b05a2b] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#94491f]"
                    >
                      Criar sala de aula
                    </button>
                    <button
                      type="button"
                      onClick={goBackToMainChat}
                      className="rounded-full border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-700 transition hover:border-stone-900 hover:text-stone-900"
                    >
                      Cancelar
                    </button>
                  </div>

                  {feedbackMessage ? (
                    <p role="status" aria-live="polite" className="text-sm leading-6 text-[#7a3c19]">{feedbackMessage}</p>
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
                      onClick={goBackToMainChat}
                      className="inline-flex items-center gap-2 rounded-full border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-900 hover:text-stone-900"
                    >
                      <ArrowLeftIcon />
                      Voltar ao chat principal
                    </button>
                    <span className="text-sm font-medium text-stone-500">
                      {selectedRoom.title}
                    </span>
                  </div>
                </div>

                <ChatPanel
                  key={`teacher-room-chat-${selectedRoom.id}`}
                  title={selectedRoom.title}
                  messages={roomChatMessages}
                  placeholder="Escreva sua mensagem para a sala"
                />
              </div>

              <aside aria-label="Detalhes e materiais da sala" className="min-h-0 overflow-y-auto border-l border-stone-200 bg-white p-5">
                <div className="grid min-h-full gap-4">
                  <section className="rounded-[1.5rem] border border-stone-200 bg-[#fffaf1] p-4">
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#b05a2b]">
                      Codigo de acesso
                    </p>
                    <p className="mt-3 text-2xl font-semibold tracking-[0.18em] text-stone-900">
                      {selectedRoom.accessCode}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-stone-600">
                      Expira em {formattedExpiry}. Apenas com este codigo os alunos entram na sala.
                    </p>
                    <button
                      type="button"
                      onClick={handleRefreshCode}
                      aria-label="Renovar codigo de acesso da sala"
                      className="mt-4 rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:border-stone-900 hover:text-stone-900"
                    >
                      Renovar codigo
                    </button>
                  </section>

                  <section className="rounded-[1.5rem] border border-stone-200 bg-white p-4">
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#b05a2b]">
                      Sala
                    </p>
                    <h3 className="mt-2 text-xl font-semibold tracking-tight text-stone-900">
                      {selectedRoom.title}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-stone-600">
                      {selectedRoom.description}
                    </p>
                    <p className="mt-4 text-sm font-medium text-stone-700">
                      {selectedRoom.studentEmails.length} aluno(s) vinculados
                    </p>
                  </section>

                  <section>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#b05a2b]">
                          Arquivos
                        </p>
                        <h3 className="mt-2 text-xl font-semibold tracking-tight text-stone-900">
                          Materiais da sala
                        </h3>
                      </div>
                      <>
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          onChange={handleImportDocuments}
                          aria-label="Selecionar documentos para importar"
                          className="sr-only"
                          tabIndex={-1}
                        />
                        <button
                          type="button"
                          onClick={openFilePicker}
                          aria-label="Importar documentos para esta sala"
                          className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:border-stone-900 hover:text-stone-900"
                        >
                          Importar documentos
                        </button>
                      </>
                    </div>

                    <div className="mt-5 grid gap-3">
                      {selectedRoom.files.length > 0 ? (
                        selectedRoom.files.map((file) => (
                          <article
                            key={file.id}
                            className="rounded-[1.25rem] border border-stone-200 bg-[#fffaf1] px-4 py-4"
                          >
                            <h4 className="text-sm font-semibold text-stone-900">
                              {file.title}
                            </h4>
                            <p className="mt-2 text-sm leading-6 text-stone-600">
                              {file.meta}
                            </p>
                          </article>
                        ))
                      ) : (
                        <div className="rounded-[1.25rem] border border-dashed border-stone-300 px-4 py-5 text-sm leading-6 text-stone-500">
                          Nenhum arquivo foi disponibilizado para esta sala ainda.
                        </div>
                      )}
                    </div>
                  </section>

                  {feedbackMessage ? (
                    <p role="status" aria-live="polite" className="text-sm leading-6 text-[#7a3c19]">{feedbackMessage}</p>
                  ) : null}
                </div>
              </aside>
            </div>
          ) : null}
        </section>
      </section>
    </main>
  );
}