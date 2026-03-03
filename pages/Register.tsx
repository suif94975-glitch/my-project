import { useLocation } from "wouter";
import { Shield, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * 注册页面 - v6.2.0 起已关闭公开注册
 * 所有账号由站长在管理后台创建
 */
export default function Register() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="w-16 h-16 rounded bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto mb-6">
          <Shield className="w-8 h-8 text-blue-400" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">注册已关闭</h1>
        <p className="text-slate-400 text-sm mb-6">
          本系统不开放公开注册。<br />
          如需账号，请联系站长创建。
        </p>
        <Button
          variant="outline"
          className="border-slate-600 text-slate-300 hover:bg-slate-800"
          onClick={() => navigate("/login")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回登录
        </Button>
      </div>
    </div>
  );
}
