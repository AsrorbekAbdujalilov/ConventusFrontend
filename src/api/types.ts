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
  first_name?: string;
  last_name?: string;
  age?: number | null;
  bio?: string;
  place_of_work_or_education?: string;
  grade?: GradeChoice | string;
  subscription?: SubscriptionChoice | string;
  subjects: Subject[];
}

export interface UserProfileUpdatePayload {
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  age?: number | null;
  bio?: string;
  place_of_work_or_education?: string;
  grade?: GradeChoice | string;
  subscription?: SubscriptionChoice | string;
  subjects?: number[];
  password?: string;
}

export interface UserProfileUpdateResponse {
  message: string;
  user: UserProfile;
}


export interface RegisterPayload {
  username: string;
  email?: string;
  password: string;
  name?: string;
  role?: string;
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

/* ==========================================================================
 * ARENA & LIVE MULTIPLAYER TYPES (ConventusBackend/arena)
 * ========================================================================== */

export interface Choice {
  id: number;
  text: string;
  is_correct?: boolean;
}

export interface Question {
  id: number;
  text: string;
  time_seconds: number;
  order: number;
  choices: Choice[];
}

export interface Quiz {
  id: string;
  owner?: string;
  title: string;
  description: string;
  visibility: 'public' | 'private';
  image_url: string;
  question_count?: number;
  questions?: Question[];
  created_at?: string;
  updated_at?: string;
}

export interface Player {
  id: number;
  display_name: string;
  points: number;
  joined_at: string;
  token?: string;
}

export interface Game {
  code: string;
  quiz: string;
  quiz_title: string;
  host: string;
  game_type: 'solo' | 'team';
  duration: number;
  is_active: boolean;
  is_started: boolean;
  started_at?: string | null;
  player_count: number;
  created_at: string;
}

export interface JoinGameResponse {
  id: number;
  display_name: string;
  token: string;
  points: number;
  joined_at: string;
}

export interface HostGameResponse {
  code: string;
  game: Game;
}

export interface GameStatusResponse {
  code: string;
  is_active: boolean;
  is_started: boolean;
  player_count: number;
  remaining_seconds: number | null;
}

export interface SubmitAnswerPayload {
  token: string;
  question_id: number;
  choice_id: number;
}

export interface AnswerResponse {
  id: number;
  question: number;
  choice: number;
  is_correct: boolean;
  answered_at: string;
}

export interface LeaderboardEntry {
  display_name: string;
  points: number;
}

export interface LeaderboardResponse {
  code: string;
  leaderboard: LeaderboardEntry[];
}

export interface CreateQuizPayload {
  title: string;
  description?: string;
  visibility?: 'public' | 'private';
  image_url?: string;
}

export interface BulkQuestionInput {
  text: string;
  time_seconds?: number;
  order?: number;
  choices: {
    text: string;
    is_correct: boolean;
  }[];
}
