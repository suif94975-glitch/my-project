/**
 * 登录页面
 * v1.0.0：访问时先检查 IP 白名单，未加白则显示限制页面
 * - 普通用户：用户名 + 密码（首次登录绑定设备指纹+IP）
 * - 站长账号：用户名 + 密码 → 邮箱验证 → 操作授权码（三重验证）
 * - 新设备/IP 登录时：提交授权申请，跳转提示页
 */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Globe, Lock, User, Eye, EyeOff, AlertCircle, Mail, KeyRound, ShieldCheck, ShieldAlert, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { setToken, setStoredUser } from "@/lib/appAuth";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** 生成设备指纹（UA + 屏幕 + 时区 + 语言的 hash） */
async function getDeviceFingerprint(): Promise<string> {
  const raw = [
    navigator.userAgent,
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.language,
    navigator.hardwareConcurrency || 0,
  ].join("|");

  try {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
  } catch {
    return raw.slice(0, 32);
  }
}

/** IP 被限制时的提示页面 */
function IpBlockedPage({ clientIp }: { clientIp?: string }) {
  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4 min-h-screen">
      <div className="text-center max-w-sm mx-auto">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded bg-red-500/20 border border-red-500/30 mb-6">
          <ShieldAlert className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">访问受限</h1>
        <p className="text-slate-400 text-sm mb-5 leading-relaxed">
          您的 IP 地址未在访问白名单中，无法访问本系统。
        </p>
        {clientIp && (
          <div className="inline-block bg-slate-800/80 border border-slate-700 rounded px-4 py-2.5 mb-5">
            <p className="text-xs text-slate-500 mb-1">您的当前 IP</p>
            <p className="text-sm font-mono text-slate-300">{clientIp}</p>
          </div>
        )}
        <p className="text-xs text-slate-500">
          如需访问权限，请联系系统管理员将您的 IP 添加到白名单。
        </p>
      </div>
    </div>
  );
}

type LoginStep = "credentials" | "email" | "authCode";

export default function Login() {
  const [, navigate] = useLocation();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [authCode, setAuthCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showAuthCode, setShowAuthCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<LoginStep>("credentials");
  const [deviceFp, setDeviceFp] = useState("");

  // 异常登录授权码验证状态
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [verifyAuthCode, setVerifyAuthCode] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [showVerifyCode, setShowVerifyCode] = useState(false);

  // 账号锁死状态
  const [isLocked, setIsLocked] = useState(false);

  // 首次登录授权码弹窗
  const [showFirstAuthDialog, setShowFirstAuthDialog] = useState(false);
  const [firstAuthCode, setFirstAuthCode] = useState("");
  const [firstAuthLoading, setFirstAuthLoading] = useState(false);
  const [firstAuthError, setFirstAuthError] = useState("");
  const [showFirstAuthCode, setShowFirstAuthCode] = useState(false);

  const loginMutation = trpc.appAuth.login.useMutation();

  // ── IP 白名单检查 ──
  // 在登录页加载时立即检查 IP，未加白则显示限制页面
  const { data: ipCheckData, isLoading: ipChecking } = trpc.appAuth.checkIpAccess.useQuery(undefined, {
    retry: 1,
    retryDelay: 2000,
    staleTime: 30 * 1000,
    // 静默处理 502/503 等网关错误
    throwOnError: false,
  });

  useEffect(() => {
    getDeviceFingerprint().then(setDeviceFp);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");

    try {
      const payload: any = {
        username: username.trim(),
        password,
        deviceFingerprint: deviceFp,
      };

      if (step === "email") payload.email = email.trim();
      if (step === "authCode") {
        payload.email = email.trim();
        payload.authCode = authCode;
      }

      const result = await loginMutation.mutateAsync(payload);

      // 需要邮箱验证（站长第二步）
      if ((result as any).needEmail) {
        setStep("email");
        setLoading(false);
        return;
      }

      // 需要操作授权码（站长第三步）
      if ((result as any).needAuthCode) {
        setStep("authCode");
        setLoading(false);
        return;
      }

      // 首次登录需要输入授权码绑定设备
      if ((result as any).needFirstAuthCode) {
        setShowFirstAuthDialog(true);
        setFirstAuthCode("");
        setFirstAuthError("");
        setLoading(false);
        return;
      }

      // 需要授权码验证（普通用户异常登录）
      if ((result as any).needVerifyAuthCode) {
        setShowVerifyDialog(true);
        setVerifyAuthCode("");
        setVerifyError("");
        setLoading(false);
        return;
      }

      if (result.success && result.token) {
        setToken(result.token);
        const u = result.user as any;
        setStoredUser({
          id: u.id,
          username: u.username,
          role: u.role,
          mustChange: u.mustChange,
        });

        if (u.mustChange) {
          navigate("/admin-first-setup");
        } else {
          toast.success(`欢迎回来，${u.username}！`);
          navigate("/");
        }
      }
    } catch (err: any) {
      const msg: string = err.message || "登录失败，请重试";
      if (msg.startsWith("LOGIN_LOCKED:") || msg.includes("已被锁定")) {
        setIsLocked(true);
        setError("账号已被锁定，请联系站长解锁");
        return;
      }
      setError(msg.replace(/^LOGIN_[A-Z_]+:/, ""));
    } finally {
      setLoading(false);
    }
  };

  // 提交首次登录授权码
  const handleFirstAuthSubmit = async () => {
    if (!firstAuthCode.trim() || firstAuthLoading) return;
    setFirstAuthLoading(true);
    setFirstAuthError("");
    try {
      const result = await loginMutation.mutateAsync({
        username: username.trim(),
        password,
        deviceFingerprint: deviceFp,
        firstAuthCode: firstAuthCode.trim(),
      });
      if (result.success && result.token) {
        setShowFirstAuthDialog(false);
        setToken(result.token);
        const u = result.user as any;
        setStoredUser({
          id: u.id,
          username: u.username,
          role: u.role,
          mustChange: u.mustChange,
        });
        toast.success(`欢迎，${u.username}！设备绑定成功。`);
        navigate("/");
      }
    } catch (err: any) {
      const msg: string = err.message || "验证失败";
      if (msg.startsWith("LOGIN_AUTH_CODE_WRONG:") || msg.includes("锁定")) {
        setShowFirstAuthDialog(false);
        setIsLocked(true);
        setError("授权码错误，账号已被锁定，请联系站长解锁");
      } else {
        setFirstAuthError(msg.replace(/^LOGIN_[A-Z_]+:/, ""));
      }
    } finally {
      setFirstAuthLoading(false);
    }
  };

  // 提交授权码验证（异常登录）
  const handleVerifySubmit = async () => {
    if (!verifyAuthCode.trim() || verifyLoading) return;
    setVerifyLoading(true);
    setVerifyError("");
    try {
      const result = await loginMutation.mutateAsync({
        username: username.trim(),
        password,
        deviceFingerprint: deviceFp,
        verifyAuthCode: verifyAuthCode.trim(),
      });
      if (result.success && result.token) {
        setShowVerifyDialog(false);
        setToken(result.token);
        const u = result.user as any;
        setStoredUser({
          id: u.id,
          username: u.username,
          role: u.role,
          mustChange: u.mustChange,
        });
        toast.success(`欢迎回来，${u.username}！`);
        navigate("/");
      }
    } catch (err: any) {
      const msg: string = err.message || "验证失败";
      if (msg.startsWith("LOGIN_AUTH_CODE_WRONG:") || msg.includes("锁定")) {
        setShowVerifyDialog(false);
        setIsLocked(true);
        setError("授权码错误，账号已被锁定，请联系站长解锁");
      } else {
        setVerifyError(msg.replace(/^LOGIN_[A-Z_]+:/, ""));
      }
    } finally {
      setVerifyLoading(false);
    }
  };

  const stepLabel = step === "credentials" ? "登 录"
    : step === "email" ? "验证邮箱"
    : "验证授权码";

  // ── IP 检查加载中 ──
  if (ipChecking) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">正在验证访问权限...</p>
        </div>
        <div className="fixed bottom-4 right-4 text-xs text-slate-600 select-none pointer-events-none">V2.0.1.0302</div>
      </div>
    );
  }

  // ── IP 未加白：显示限制页面 ──
  if (ipCheckData && !ipCheckData.allowed) {
    return (
      <>
        <IpBlockedPage clientIp={(ipCheckData as any).clientIp} />
        <div className="fixed bottom-4 right-4 text-xs text-slate-600 select-none pointer-events-none">V2.0.1.0302</div>
      </>
    );
  }

  // ── IP 通过：显示登录表单 ──
  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4 min-h-screen">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded bg-blue-600 mb-5  shadow-blue-600/25 ring-4 ring-blue-600/10">
            <Globe className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">域名工具箱</h1>
          <p className="text-slate-500 text-sm mt-1.5">
            {step === "credentials" && "登录以使用全部功能"}
            {step === "email" && "请输入绑定邮箱进行二重验证"}
            {step === "authCode" && "请输入操作授权码完成三重验证"}
          </p>
        </div>

        {/* 账号锁死提示 */}
        {isLocked && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded flex items-start gap-3">
            <Lock className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-red-300 font-semibold text-sm">账号已被锁定</p>
              <p className="text-red-400/80 text-xs mt-1">因授权码输入错误，账号已被系统自动锁定。请联系站长解锁后再试。</p>
            </div>
          </div>
        )}

        {/* 步骤指示器（仅站长三重验证时显示） */}
        {step !== "credentials" && (
          <div className="flex items-center justify-center gap-1.5 mb-6">
            {(["credentials", "email", "authCode"] as LoginStep[]).map((s, i) => {
              const steps = ["credentials", "email", "authCode"] as LoginStep[];
              const curIdx = steps.indexOf(step);
              const sIdx = steps.indexOf(s);
              const isDone = sIdx < curIdx;
              const isActive = s === step;
              return (
                <div key={s} className="flex items-center gap-1.5">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-200 ${
                    isActive ? "bg-blue-600 text-white ring-2 ring-blue-600/30" :
                    isDone ? "bg-emerald-600/20 text-emerald-400 border border-emerald-600/40" :
                    "bg-slate-800 text-slate-500 border border-slate-700"
                  }`}>
                    {isDone ? "✓" : i + 1}
                  </div>
                  {i < 2 && <div className={`w-10 h-px transition-colors duration-200 ${sIdx < curIdx ? "bg-emerald-600/50" : "bg-slate-700"}`} />}
                </div>
              );
            })}
          </div>
        )}

        {/* 登录卡片 */}
        <div className="bg-slate-900/80  border border-slate-800 rounded p-7 shadow-2xl ring-1 ring-white/5">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* 第一步：用户名 + 密码 */}
            {step === "credentials" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-slate-300 text-sm font-medium">用户名</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="username"
                      type="text"
                      placeholder="请输入用户名"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 h-11"
                      disabled={loading || isLocked}
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-300 text-sm font-medium">密码</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="请输入密码"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="pl-10 pr-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 h-11"
                      disabled={loading || isLocked}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* 第二步：邮箱验证（站长） */}
            {step === "email" && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded mb-4">
                  <ShieldCheck className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <p className="text-blue-300 text-sm">已验证密码，请继续完成二重验证</p>
                </div>
                <Label htmlFor="email" className="text-slate-300 text-sm font-medium">绑定邮箱</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="请输入注册时绑定的邮箱"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 h-11"
                    disabled={loading}
                    autoFocus
                  />
                </div>
              </div>
            )}

            {/* 第三步：操作授权码（站长） */}
            {step === "authCode" && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded mb-4">
                  <ShieldCheck className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <p className="text-green-300 text-sm">邮箱验证通过，请输入操作授权码</p>
                </div>
                <Label htmlFor="authCode" className="text-slate-300 text-sm font-medium">操作授权码</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="authCode"
                    type={showAuthCode ? "text" : "password"}
                    placeholder="请输入操作授权码"
                    value={authCode}
                    onChange={e => setAuthCode(e.target.value)}
                    className="pl-10 pr-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 h-11"
                    disabled={loading}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowAuthCode(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                    tabIndex={-1}
                  >
                    {showAuthCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* 错误提示 */}
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded">
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold rounded  shadow-blue-600/20 transition-all duration-150"
              disabled={
                loading || isLocked ||
                (step === "credentials" && (!username.trim() || !password)) ||
                (step === "email" && !email.trim()) ||
                (step === "authCode" && !authCode)
              }
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  验证中...
                </span>
              ) : stepLabel}
            </Button>

            {/* 返回上一步 */}
            {step !== "credentials" && (
              <button
                type="button"
                onClick={() => {
                  setStep(step === "authCode" ? "email" : "credentials");
                  setError("");
                }}
                className="w-full text-slate-400 hover:text-slate-300 text-sm text-center transition-colors"
              >
                ← 返回上一步
              </button>
            )}
          </form>

        </div>

        <p className="text-center text-slate-600 text-xs mt-5">
          如需账号，请联系站长创建
        </p>
      </div>

      {/* 右下角版本号 */}
      <div className="fixed bottom-4 right-4 text-xs text-slate-600 select-none pointer-events-none">
        V2.0.1.0302
      </div>

      {/* 首次登录授权码绑定弹窗 */}
      <Dialog open={showFirstAuthDialog} onOpenChange={(open) => { if (!open && !firstAuthLoading) setShowFirstAuthDialog(false); }}>
        <DialogContent className="sm:max-w-sm bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <ShieldCheck className="w-5 h-5 text-green-400" />
              首次登录 · 设备绑定
            </DialogTitle>
            <DialogDescription className="sr-only">首次登录设备绑定验证</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded">
              <p className="text-green-300 text-sm font-medium">欢迎首次登录</p>
              <p className="text-green-400/80 text-xs mt-1">
                请输入站长提供的授权码，验证成功后将绑定您的当前设备和 IP。
                <span className="text-red-400 font-medium"> 输入错误将立即锁定账号。</span>
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">授权码</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type={showFirstAuthCode ? "text" : "password"}
                  placeholder="请输入站长提供的授权码"
                  value={firstAuthCode}
                  onChange={e => setFirstAuthCode(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleFirstAuthSubmit()}
                  className="pl-10 pr-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-green-500 h-11"
                  disabled={firstAuthLoading}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowFirstAuthCode(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                >
                  {showFirstAuthCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {firstAuthError && (
              <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded">
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-red-400 text-sm">{firstAuthError}</p>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                onClick={() => setShowFirstAuthDialog(false)}
                disabled={firstAuthLoading}
              >
                取消
              </Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-500 text-white"
                onClick={handleFirstAuthSubmit}
                disabled={!firstAuthCode.trim() || firstAuthLoading}
              >
                {firstAuthLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    验证中...
                  </span>
                ) : "确认绑定"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 异常登录授权码验证弹窗 */}
      <Dialog open={showVerifyDialog} onOpenChange={(open) => { if (!open && !verifyLoading) setShowVerifyDialog(false); }}>
        <DialogContent className="sm:max-w-sm bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              检测到异常登录
            </DialogTitle>
            <DialogDescription className="sr-only">异常登录授权码验证</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded">
              <p className="text-amber-300 text-sm font-medium">当前 IP 或设备与绑定记录不符</p>
              <p className="text-amber-400/80 text-xs mt-1">
                请输入授权码完成验证。<span className="text-red-400 font-medium">输入错误将立即锁定账号。</span>
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">授权码</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type={showVerifyCode ? "text" : "password"}
                  placeholder="请输入授权码"
                  value={verifyAuthCode}
                  onChange={e => setVerifyAuthCode(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleVerifySubmit()}
                  className="pl-10 pr-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-amber-500 h-11"
                  disabled={verifyLoading}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowVerifyCode(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                >
                  {showVerifyCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {verifyError && (
              <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded">
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-red-400 text-sm">{verifyError}</p>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                onClick={() => setShowVerifyDialog(false)}
                disabled={verifyLoading}
              >
                取消
              </Button>
              <Button
                className="flex-1 bg-amber-600 hover:bg-amber-500 text-white"
                onClick={handleVerifySubmit}
                disabled={!verifyAuthCode.trim() || verifyLoading}
              >
                {verifyLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    验证中...
                  </span>
                ) : "确认验证"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
