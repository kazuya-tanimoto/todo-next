export interface List {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface Todo {
  id: string;
  list_id: string;
  text: string;
  completed: boolean;
  created_at: string;
}

export type Theme = "mono" | "natural" | "brutal";
