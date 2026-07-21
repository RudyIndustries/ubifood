import type { AppRole } from "./types";

export function roleHomePath(role: AppRole | null | undefined) {
  if (role === "admin") {
    return "/admin";
  }

  if (role === "comercio") {
    return "/comercio";
  }

  return "/cliente";
}

