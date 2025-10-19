// types.ts
export interface Profile {
  id: string;
  username: string;
  email?: string;
}

export interface Theme {
  id: string;
  name: string;
  description?: string;
}

export interface Question {
  id: string;
  author_id?: string;
  theme_id?: string;
  title: string;
  content: string;
  created_at?: string;
  updated_at?: string;
  author?: Profile | null;
  theme?: Theme | null;
}

export interface QuestionRow {
  id: string;
  title: string;
  content: string;
  author_id?: string | null;
  theme_id?: string | null;
  created_at?: string;
  author?: { id?: string; username?: string }[] | null;
  theme?: { id?: string; name?: string }[] | null;
}

export interface Reponse {
  id: string;
  question_id: string;
  author_id?: string | null;
  content: string;
  created_at?: string;
  updated_at?: string;
  author?: { id?: string; username?: string } | null;
}
