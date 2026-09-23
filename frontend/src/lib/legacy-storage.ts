const LEGACY_KEYS = [
  'pia.student.registration',
  'pia.teacher.registration',
  'pia.student.learning-profile',
] as const;

/** Apaga do navegador os dados do cadastro local antigo, substituído pela sessão do backend. */
export function purgeLegacyLocalData(): void {
  if (typeof window === 'undefined') return;
  for (const key of LEGACY_KEYS) {
    window.localStorage.removeItem(key);
  }
}
