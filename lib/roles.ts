import type { UserRole } from "@/types/post";

export function homeForRole(role?: UserRole | null) {
  if (role === "COMPANY") return "/company";
  if (role === "ADMIN") return "/admin";
  return "/";
}

export function isCompanyRole(role?: UserRole | null) {
  return role === "COMPANY";
}

export function isAdminRole(role?: UserRole | null) {
  return role === "ADMIN";
}

export function isCandidateRole(role?: UserRole | null) {
  return !role || role === "CANDIDATE";
}

export function canManagePosts(role?: UserRole | null) {
  return role === "COMPANY" || role === "ADMIN";
}

/** Entreprise et candidat peuvent créer des posts (enregistrés dans MongoDB). */
export function canCreatePosts(role?: UserRole | null) {
  return role === "CANDIDATE" || role === "COMPANY" || role === "ADMIN";
}

export function pathAfterLogin(role: UserRole, next?: string | null) {
  if (!next || next === "/" || next === "/posts" || next === "/saved") {
    return homeForRole(role);
  }
  if (next.startsWith("/entreprises/") || next.startsWith("/candidats/")) {
    return next;
  }
  if (role === "CANDIDATE") {
    if (next.startsWith("/company") || next.startsWith("/admin")) {
      return "/";
    }
    if (next.startsWith("/apply") || next.startsWith("/posts/new") || /\/edit\/?$/.test(next)) {
      return next;
    }
  }
  if (role === "COMPANY") {
    if (next.startsWith("/admin") || next === "/" || next.startsWith("/saved")) {
      return "/company";
    }
  }
  if (role === "ADMIN") {
    if (next.startsWith("/company") || next === "/" || next.startsWith("/saved")) {
      return "/admin/reports";
    }
  }
  return next;
}
