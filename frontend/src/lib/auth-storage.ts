export type UserRole = "student" | "teacher";

export type StoredStudentRegistration = {
  role: "student";
  fullName: string;
  email: string;
  birthDate: string;
  roomCode: string;
  password: string;
};

export type StoredTeacherRegistration = {
  role: "teacher";
  fullName: string;
  email: string;
  expertiseArea: string;
  password: string;
};

export type StudentLearningProfile = {
  preferredFormat: string;
  learningPace: string;
  mainDifficulty: string;
  supportNeeds: string;
  studyGoal: string;
};

export type StoredRegistration =
  | StoredStudentRegistration
  | StoredTeacherRegistration;

const storageKeys = {
  student: "pia.student.registration",
  teacher: "pia.teacher.registration",
  studentLearningProfile: "pia.student.learning-profile",
} as const;

export function saveRegistration(registration: StoredRegistration) {
  if (typeof window === "undefined") {
    return;
  }

  const storageKey =
    registration.role === "student" ? storageKeys.student : storageKeys.teacher;

  window.localStorage.setItem(storageKey, JSON.stringify(registration));
}

export function getRegistration(role: UserRole): StoredRegistration | null {
  if (typeof window === "undefined") {
    return null;
  }

  const storageKey = role === "student" ? storageKeys.student : storageKeys.teacher;
  const rawValue = window.localStorage.getItem(storageKey);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as StoredRegistration;
  } catch {
    return null;
  }
}

export function saveStudentLearningProfile(profile: StudentLearningProfile) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    storageKeys.studentLearningProfile,
    JSON.stringify(profile),
  );
}

export function getStudentLearningProfile(): StudentLearningProfile | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(storageKeys.studentLearningProfile);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as StudentLearningProfile;
  } catch {
    return null;
  }
}

export function clearStudentLearningProfile() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(storageKeys.studentLearningProfile);
}
