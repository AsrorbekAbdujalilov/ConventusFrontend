export interface Subject {
  id: number;
  name: string;
}

export type GradeChoice =
  | '1st'
  | '2nd'
  | '11th'
  | '12th'
  | 'Other';

export type SubscriptionChoice = 'FREE' | 'PREMIUM' | 'MAX';

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  age?: number | null;
  bio?: string;
  place_of_work_or_education?: string;
  grade?: GradeChoice | string;
  subscription?: SubscriptionChoice | string;
  subjects: Subject[];
}

export interface RegisterPayload {
  username: string;
  email?: string;
  password: string;
  age?: number;
  bio?: string;
  place_of_work_or_education?: string;
  grade?: string;
  subscription?: string;
  subjects?: number[];
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface AuthResponse {
  message: string;
  user?: UserProfile;
}

export interface AuthStatusResponse {
  authenticated: boolean;
  user?: UserProfile;
}

export interface HealthCheckResponse {
  status: string;
  message: string;
}

export interface ApiErrorResponse {
  message?: string;
  detail?: string;
  [key: string]: unknown;
}
