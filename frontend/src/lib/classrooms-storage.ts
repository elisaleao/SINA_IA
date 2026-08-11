export type StoredClassroomFile = {
  id: string;
  title: string;
  meta: string;
};

export type StoredClassroom = {
  id: string;
  title: string;
  description: string;
  teacherName: string;
  teacherEmail: string;
  studentEmails: string[];
  files: StoredClassroomFile[];
  accessCode: string;
  accessCodeExpiresAt: string;
  createdAt: string;
};

type CreateClassroomInput = {
  title: string;
  description: string;
  teacherName: string;
  teacherEmail: string;
};

type JoinClassroomResult =
  | { status: "joined"; room: StoredClassroom }
  | { status: "already-joined"; room: StoredClassroom }
  | { status: "invalid-code" };

const storageKey = "pia.classrooms";
const classroomsUpdatedEvent = "pia:classrooms-updated";
const accessCodeLifetimeInMs = 24 * 60 * 60 * 1000;

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeAccessCode(code: string) {
  return code.trim().toUpperCase();
}

function createAccessCode(existingCodes: Set<string>) {
  let nextCode = "";

  do {
    nextCode = `${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random()
      .toString(36)
      .slice(2, 6)
      .toUpperCase()}`;
  } while (existingCodes.has(nextCode));

  return nextCode;
}

function createAccessCodeExpiry(referenceTime = Date.now()) {
  return new Date(referenceTime + accessCodeLifetimeInMs).toISOString();
}

function persistClassrooms(classrooms: StoredClassroom[], notify = true) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(classrooms));

  if (notify) {
    window.dispatchEvent(new Event(classroomsUpdatedEvent));
  }
}

function parseStoredClassrooms(rawValue: string | null) {
  if (!rawValue) {
    return [] as StoredClassroom[];
  }

  try {
    const parsedValue = JSON.parse(rawValue) as StoredClassroom[];
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch {
    return [];
  }
}

function refreshExpiredCodes(classrooms: StoredClassroom[]) {
  const now = Date.now();
  const existingCodes = new Set<string>();
  let hasChanges = false;

  const refreshedClassrooms = classrooms.map((room) => {
    const isExpired = new Date(room.accessCodeExpiresAt).getTime() <= now;

    if (!isExpired) {
      existingCodes.add(room.accessCode);
      return room;
    }

    hasChanges = true;
    const nextCode = createAccessCode(existingCodes);
    existingCodes.add(nextCode);

    return {
      ...room,
      accessCode: nextCode,
      accessCodeExpiresAt: createAccessCodeExpiry(now),
    };
  });

  return { refreshedClassrooms, hasChanges };
}

function readClassrooms() {
  if (typeof window === "undefined") {
    return [] as StoredClassroom[];
  }

  const storedClassrooms = parseStoredClassrooms(
    window.localStorage.getItem(storageKey),
  );
  const { refreshedClassrooms, hasChanges } = refreshExpiredCodes(storedClassrooms);

  if (hasChanges) {
    persistClassrooms(refreshedClassrooms, false);
  }

  return refreshedClassrooms;
}

export function getTeacherClassrooms(teacherEmail: string) {
  return readClassrooms().filter((room) => room.teacherEmail === teacherEmail);
}

export function getStudentClassrooms(studentEmail: string) {
  return readClassrooms().filter((room) => room.studentEmails.includes(studentEmail));
}

export function createClassroom(input: CreateClassroomInput) {
  const classrooms = readClassrooms();
  const existingCodes = new Set(classrooms.map((room) => room.accessCode));
  const now = Date.now();

  const classroom: StoredClassroom = {
    id: createId("classroom"),
    title: input.title.trim(),
    description: input.description.trim(),
    teacherName: input.teacherName.trim(),
    teacherEmail: input.teacherEmail.trim().toLowerCase(),
    studentEmails: [],
    files: [],
    accessCode: createAccessCode(existingCodes),
    accessCodeExpiresAt: createAccessCodeExpiry(now),
    createdAt: new Date(now).toISOString(),
  };

  persistClassrooms([...classrooms, classroom]);

  return classroom;
}

export function refreshClassroomAccessCode(roomId: string, teacherEmail: string) {
  const classrooms = readClassrooms();
  const existingCodes = new Set(
    classrooms
      .filter((room) => room.id !== roomId)
      .map((room) => room.accessCode),
  );
  let refreshedRoom: StoredClassroom | null = null;

  const updatedClassrooms = classrooms.map((room) => {
    if (room.id !== roomId || room.teacherEmail !== teacherEmail) {
      return room;
    }

    refreshedRoom = {
      ...room,
      accessCode: createAccessCode(existingCodes),
      accessCodeExpiresAt: createAccessCodeExpiry(),
    };

    return refreshedRoom;
  });

  if (!refreshedRoom) {
    return null;
  }

  persistClassrooms(updatedClassrooms);

  return refreshedRoom;
}

export function addClassroomFiles(
  roomId: string,
  teacherEmail: string,
  files: StoredClassroomFile[],
) {
  const classrooms = readClassrooms();
  let updatedRoom: StoredClassroom | null = null;

  const updatedClassrooms = classrooms.map((room) => {
    if (room.id !== roomId || room.teacherEmail !== teacherEmail) {
      return room;
    }

    updatedRoom = {
      ...room,
      files: [...room.files, ...files],
    };

    return updatedRoom;
  });

  if (!updatedRoom) {
    return null;
  }

  persistClassrooms(updatedClassrooms);

  return updatedRoom;
}

export function joinClassroomByCode(
  studentEmail: string,
  accessCode: string,
): JoinClassroomResult {
  const normalizedCode = normalizeAccessCode(accessCode);
  const classrooms = readClassrooms();
  const matchingRoom = classrooms.find((room) => room.accessCode === normalizedCode);

  if (!matchingRoom) {
    return { status: "invalid-code" };
  }

  if (matchingRoom.studentEmails.includes(studentEmail)) {
    return { status: "already-joined", room: matchingRoom };
  }

  const updatedRoom = {
    ...matchingRoom,
    studentEmails: [...matchingRoom.studentEmails, studentEmail],
  };

  persistClassrooms(
    classrooms.map((room) => (room.id === matchingRoom.id ? updatedRoom : room)),
  );

  return { status: "joined", room: updatedRoom };
}

export function subscribeToClassrooms(onChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleWindowUpdate = () => onChange();
  const handleStorageUpdate = (event: StorageEvent) => {
    if (event.key === storageKey) {
      onChange();
    }
  };

  window.addEventListener(classroomsUpdatedEvent, handleWindowUpdate);
  window.addEventListener("storage", handleStorageUpdate);

  return () => {
    window.removeEventListener(classroomsUpdatedEvent, handleWindowUpdate);
    window.removeEventListener("storage", handleStorageUpdate);
  };
}