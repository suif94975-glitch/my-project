/**
 * 全局鉴权守卫：未登录时重定向到 /login
 * 包裹所有需要登录才能访问的路由
 * v6.5.0: 添加 IP 白名单检查，非白名单 IP 显示访问限制页面
 */
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { getToken, getStoredUser } from "@/lib/appAuth";
import { trpc } from "@/lib/trpc";
import { ShieldAlert } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

const PUBLIC_PATHS = ["/login", "/admin-first-setup"];
const ADMIN_PATHS = ["/admin"];

/** IP 被限制时的提示页面 */
function IpBlockedPage({ clientIp }: { clientIp?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center max-w-sm mx-auto px-6">
        <div className="w-16 h-16 rounded bg-red-100 flex items-center justify-center mx-auto mb-5">
          <ShieldAlert className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-xl font-bold text-slate-800 mb-2">访问受限</h1>
        <p className="text-slate-500 text-sm mb-4">
          您的 IP 地址未在访问白名单中，无法访问本系统。
        </p>
        {clientIp && (
          <p className="text-xs text-slate-400 font-mono bg-slate-100 rounded px-3 py-2 inline-block">
            您的 IP：{clientIp}
          </p>
        )}
        <p className="text-xs text-slate-400 mt-4">
          如需访问权限，请联系系统管理员将您的 IP 添加到白名单。
        </p>
      </div>
    </div>
  );
}

export default function AppAuthGuard({ children }: Props) {
  const [location, navigate] = useLocation();
  const [ipBlocked, setIpBlocked] = useState(false);
  const [blockedIp, setBlockedIp] = useState<string | undefined>();

  // IP 访问检查（仅在非公开路径时执行）
  const isPublicPath = PUBLIC_PATHS.includes(location);
  const { data: ipCheckData } = trpc.appAuth.checkIpAccess.useQuery(undefined, {
    enabled: !isPublicPath,
    retry: 1, // 网络波动时重试一次
    retryDelay: 2000,
    staleTime: 60 * 1000, // 1分钟内不重新检查
    // 静默处理 502/503 等网关错误，避免控制台报错
    throwOnError: false,
  });

  useEffect(() => {
    if (ipCheckData) {
      if (!ipCheckData.allowed) {
        setIpBlocked(true);
        setBlockedIp((ipCheckData as any).clientIp);
      } else {
        setIpBlocked(false);
      }
    }
  }, [ipCheckData]);

  useEffect(() => {
    if (PUBLIC_PATHS.includes(location)) return;

    const token = getToken();
    if (!token) {
      navigate("/login");
      return;
    }

    // 检查是否需要首次修改（站长账号首登）
    const user = getStoredUser();
    if (user?.mustChange && location !== "/admin-first-setup") {
      navigate("/admin-first-setup");
      return;
    }

    // 管理后台只允许 admin 角色访问
    if (ADMIN_PATHS.some(p => location.startsWith(p)) && user?.role !== "admin") {
      navigate("/");
    }
  }, [location, navigate]);

  // 公开路由直接渲染
  if (PUBLIC_PATHS.includes(location)) {
    return <>{children}</>;
  }

  // IP 被限制时显示提示页面
  if (ipBlocked) {
    return <IpBlockedPage clientIp={blockedIp} />;
  }

  // 未登录时不渲染内容（等待重定向）
  if (!getToken()) {
    return null;
  }

  // 需要首次修改时只允许访问 admin-first-setup
  const user = getStoredUser();
  if (user?.mustChange && location !== "/admin-first-setup") {
    return null;
  }

  // 管理后台只允许 admin 角色渲染
  if (ADMIN_PATHS.some(p => location.startsWith(p)) && user?.role !== "admin") {
    return null;
  }

  return <>{children}</>;
}
