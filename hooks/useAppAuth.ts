import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import {
  getToken, setToken, clearToken,
  getStoredUser, setStoredUser,
  type AppUser,
} from "@/lib/appAuth";

interface AppAuthState {
  user: AppUser | null;
  loading: boolean;
  isLoggedIn: boolean;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

export function useAppAuth(): AppAuthState {
  const [user, setUser] = useState<AppUser | null>(getStoredUser);
  const [loading, setLoading] = useState(!!getToken());

  const loginMutation = trpc.appAuth.login.useMutation();

  // 验证 token 有效性（页面加载时）
  const meQuery = trpc.appAuth.me.useQuery(undefined, {
    enabled: !!getToken(),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (meQuery.isSuccess) {
      if (meQuery.data) {
        const u = meQuery.data as AppUser;
        setUser(u);
        setStoredUser(u);
      } else {
        // token 失效
        clearToken();
        setUser(null);
      }
      setLoading(false);
    } else if (meQuery.isError) {
      clearToken();
      setUser(null);
      setLoading(false);
    }
  }, [meQuery.isSuccess, meQuery.isError, meQuery.data]);

  const login = useCallback(async (username: string, password: string) => {
    const result = await loginMutation.mutateAsync({ username, password });
    if (result.token) {
      setToken(result.token);
    }
    if (result.user) {
      const u = result.user as AppUser;
      setUser(u);
      setStoredUser(u);
    }
  }, [loginMutation]);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  return {
    user,
    loading,
    isLoggedIn: !!user,
    isAdmin: user?.role === "admin",
    login,
    logout,
  };
}
