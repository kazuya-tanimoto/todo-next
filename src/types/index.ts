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

export interface InviteToken {
  id: string;
  list_id: string;
  token: string;
  created_by: string;
  created_at: string;
  expires_at: string;
  is_active: boolean;
}

export interface ListShare {
  list_id: string;
  user_id: string;
}

export interface Profile {
  id: string;
  display_name: string;
  created_at: string;
}

export interface ListMember {
  user_id: string;
  email: string;
  display_name: string | null;
  is_owner: boolean;
}

export type Theme = "mono" | "natural" | "brutal";
