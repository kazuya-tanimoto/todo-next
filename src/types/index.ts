export interface List {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

export type Theme = "mono" | "natural" | "brutal";
