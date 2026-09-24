import type { components } from './api-types';

export type Schemas = components['schemas'];

export type UserResponse = Schemas['UserResponse'];
export type UserRole = Schemas['UserRole'];
export type TokenResponse = Schemas['TokenResponse'];
export type LoginRequest = Schemas['LoginRequest'];
export type RegisterRequest = Schemas['RegisterRequest'];
export type AccessibilityPreferencesResponse = Schemas['AccessibilityPreferencesResponse'];
export type AccessibilityPreferencesUpdate = Schemas['AccessibilityPreferencesUpdate'];
export type AccessibilityConfig = Schemas['AccessibilityConfig'];
export type TeacherConfig = Schemas['TeacherConfig'];
export type TTSEngine = Schemas['TTSEngine'];

export type GenerationType = Schemas['GenerationType'];
export type GenerateRequest = Schemas['GenerateRequest'];
export type GenerationResponse = Schemas['GenerationResponse'];
export type DocumentProcessResponse = Schemas['DocumentProcessResponse'];

export type ExerciseLevel = Schemas['ExerciseLevel'];
export type ExercisePublicQuestion = Schemas['ExercisePublicQuestion'];
export type StartSessionRequest = Schemas['StartSessionRequest'];
export type SessionResponse = Schemas['SessionResponse'];
export type SubmitAnswerRequest = Schemas['SubmitAnswerRequest'];
export type AnswerFeedbackResponse = Schemas['AnswerFeedbackResponse'];
export type SessionResultResponse = Schemas['SessionResultResponse'];
