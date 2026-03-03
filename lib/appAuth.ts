/**
 * 应用内认证状态管理（独立于 Manus OAuth）
 * 使用 localStorage 存储 JWT token
 */

const TOKEN_KEY = "dc_app_token";
const USER_KEY = "dc_app_user";

export interface AppUser {
  id: number;
  username: string;
  role: "admin" | "user";
  /** 是否是站长（唯一超级管理员） */
  isOwner?: boolean;
  /** 首次登录是否需要强制修改（站长专属） */
  mustChange?: boolean;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): AppUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: AppUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

/**
 * 获取带 Authorization 头的 fetch 配置
 * 供 tRPC 以外的直接 fetch 调用使用
 */
export function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
