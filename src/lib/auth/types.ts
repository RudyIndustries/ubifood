export type AppRole = "admin" | "cliente" | "comercio";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: AppRole;
};

export type AuthFormState = {
  status: "idle" | "error" | "success";
  message: string;
};

