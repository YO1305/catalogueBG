import type { Role } from "@/types";

export function canEditFabrics(role: Role) {
  return role === "admin" || role === "designer";
}

export function canEditCatalogs(role: Role) {
  return role === "admin" || role === "manager";
}

export function canReadLeads(role: Role) {
  return role === "admin" || role === "manager";
}

export function canReadStats(role: Role) {
  return role === "admin" || role === "manager" || role === "designer";
}

export function canEditDictionaries(role: Role) {
  return role === "admin" || role === "designer" || role === "manager";
}

export function isAdmin(role: Role) {
  return role === "admin";
}
