export interface Role {
  id: string;
  name: string;
}

export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role_id: string;
  created_at: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role_id: string;
  role: Role;
  created_at: string;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role_id: string;
  role?: Role;
  created_at: string;
}

export interface AuthorResponse {
  id: string;
  name: string;
  role: Role;
}

export interface UserSession {
  id: string;
  user_id: string;
  refresh_token_hash: string;
  device_name: string | null;
  ip_address: string | null;
  location: string | null;
  last_active_at: string;
  expires_at: string;
  created_at: string;
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  description: string;
  excerpt: string;
  content: string;
  category: string;
  published_at: string;
  author_id: string | null;
  created_at: string;
}

export interface Symptom {
  id: string;
  text: string;
  disorder_id: string;
}

export interface Disorder {
  id: string;
  slug: string;
  title: string;
  description: string;
}

export type TestimonialStatus = 'pending' | 'approved' | 'rejected';

export interface Testimonial {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  author_id: string;
  status: TestimonialStatus;
  created_at: string;
}

export interface Diarie {
  id: string;
  mood: string;
  text: string;
  tag: string;
  user_id: string;
  created_at: string;
}

export interface DailyReflection {
  id: string;
  phrase: string;
  author: string | null;
  show_date: string | null;
  active: boolean;
  created_at: string;
}

export type HabitCategory = 'Físico' | 'Mental' | 'Emocional' | 'Social';

export interface Habit {
  id: string;
  user_id: string;
  text: string;
  completed: boolean;
  category: HabitCategory;
  created_at: string;
}
