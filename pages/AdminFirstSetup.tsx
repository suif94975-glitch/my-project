/**
 * 站长首次登录强制设置页面
 * 必须完成：验证默认授权码 + 修改密码 + 设置邮箱 + 设置新操作授权码
 * 操作授权码不可与密码/用户名/默认授权码相同
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { Shield, Eye, EyeOff, KeyRound, Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { setToken, setStoredUser } from "@/lib/appAuth";
import { toast } from "sonner";

export default function AdminFirstSetup() {
  const [, navigate] = useLocation();
  const [defaultAuthCode, setDefaultAuthCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [authCode, setAuthCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showAuthCode, setShowAuthCode] = useState(false);
  const [showDefaultCode, setShowDefaultCode] = useState(false);
  const [loading, setLoading] = useState(false);

  const setupMutation = trpc.appAuth.adminFirstSetup.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!defaultAuthCode) {
      toast.error("请输入初始授权码");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("新密码至少 6 位");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("两次密码输入不一致");
      return;
    }
    if (!email.includes("@")) {
      toast.error("请输入有效的邮箱地址");
      return;
    }
    if (authCode.length < 6) {
      toast.error("操作授权码至少 6 位");
      return;
    }
    if (authCode === newPassword) {
      toast.error("操作授权码不能与密码相同");
      return;
    }
    if (authCode === defaultAuthCode) {
      toast.error("新授权码不能与初始授权码相同");
      return;
    }

    setLoading(true);
    try {
      const result = await setupMutation.mutateAsync({
        defaultAuthCode,
        newPassword,
        email,
        authCode,
      });

      if (result.success && result.token) {
        setToken(result.token);
        setStoredUser({ id: 0, username: "adnim", role: "admin", mustChange: false });
        toast.success("设置完成，欢迎使用！");
        navigate("/");
      }
    } catch (err: any) {
      toast.error(err.message || "设置失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* 标题 */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded bg-blue-600 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">站长账号初始化</h1>
          <p className="text-slate-400 text-sm">
            首次登录必须完成以下安全设置
          </p>
        </div>

        {/* 安全提示 */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded p-4 mb-6">
          <div className="flex gap-2">
            <KeyRound className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-300 space-y-1">
              <p className="font-medium">安全须知</p>
              <p>请先输入初始授权码 <code className="bg-amber-500/20 px-1 rounded font-mono">qwer1234</code> 进行身份验证。</p>
              <p>操作授权码是站长专属的第三重验证，每次登录都需要输入，<strong>请妥善保管</strong>。</p>
            </div>
          </div>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="bg-slate-800 rounded p-6 space-y-5">
          {/* 初始授权码验证 */}
          <div className="space-y-2">
            <Label className="text-slate-200 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-400" />
              初始授权码验证
            </Label>
            <div className="relative">
              <Input
                type={showDefaultCode ? "text" : "password"}
                value={defaultAuthCode}
                onChange={e => setDefaultAuthCode(e.target.value)}
                placeholder="请输入初始授权码 qwer1234"
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowDefaultCode(!showDefaultCode)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showDefaultCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-slate-500">系统初始授权码，用于验证您的站长身份</p>
          </div>

          <div className="border-t border-slate-700 pt-4">
            <p className="text-xs text-slate-400 mb-4">以下为您的新安全信息，设置后生效：</p>
          </div>

          {/* 新密码 */}
          <div className="space-y-2">
            <Label className="text-slate-200 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              新密码
            </Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="至少 6 位，请勿使用初始密码"
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* 确认密码 */}
          <div className="space-y-2">
            <Label className="text-slate-200 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              确认新密码
            </Label>
            <Input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="再次输入新密码"
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
              required
            />
          </div>

          {/* 邮箱 */}
          <div className="space-y-2">
            <Label className="text-slate-200 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              绑定邮箱
            </Label>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="用于二重验证，可使用虚拟邮箱"
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
              required
            />
            <p className="text-xs text-slate-500">此邮箱将用于每次登录的二重验证，请记住</p>
          </div>

          {/* 新操作授权码 */}
          <div className="space-y-2">
            <Label className="text-slate-200 flex items-center gap-2">
              <KeyRound className="w-4 h-4" />
              新操作授权码
            </Label>
            <div className="relative">
              <Input
                type={showAuthCode ? "text" : "password"}
                value={authCode}
                onChange={e => setAuthCode(e.target.value)}
                placeholder="至少 6 位，不可与密码或初始授权码相同"
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowAuthCode(!showAuthCode)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showAuthCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-slate-500">
              此授权码每次登录都需要输入，请妥善保管
            </p>
          </div>

          <Button
            type="submit"
            disabled={loading || !defaultAuthCode || !newPassword || !email || !authCode}
            className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white font-semibold"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                正在保存...
              </span>
            ) : "完成设置并进入系统"}
          </Button>
        </form>
      </div>
    </div>
  );
}
