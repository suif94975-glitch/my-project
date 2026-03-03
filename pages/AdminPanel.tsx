import React, { useState } from "react";
import { useLocation, useSearch } from "wouter";
import {
  Users, CheckCircle2, XCircle, Shield,
  BarChart2, Copy, Search, RefreshCw, KeyRound,
  ArrowLeft, LogOut, ShieldAlert, Monitor, Wifi, UserPlus, Lock, Globe, Plus, Trash2,
  Eye, Activity, FileText, Send, MessageCircle, Settings2,
  ChevronDown, ChevronRight, ToggleLeft, ToggleRight, Map, Pencil
} from "lucide-react";
import { SITE_TYPES } from "@/lib/domainConstants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useAppAuth } from "@/hooks/useAppAuth";
import AppNav from "@/components/AppNav";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type UserStatus = "pending" | "active" | "rejected" | "locked";
type UserRole = "admin" | "user";

interface UserRow {
  id: number;
  username: string;
  role: UserRole;
  isOwner: boolean;
  status: UserStatus;
  remark: string | null;
  email: string | null;
  createdAt: Date;
  lastActiveAt: Date | null;
  checkCount: number;
}

interface AuthReqRow {
  id: number;
  appUserId: number;
  username: string;
  ip: string;
  deviceFingerprint: string;
  status: "pending" | "approved" | "rejected";
  requestedAt: Date;
  reviewedAt: Date | null;
}

interface IpWhitelistRow {
  id: number;
  ip: string;
  remark: string | null;
  createdBy: number;
  createdAt: Date;
}

const STATUS_LABEL: Record<UserStatus, { label: string; color: string }> = {
  pending: { label: "待激活", color: "bg-amber-100 text-amber-700 border-amber-200" },
  active: { label: "已激活", color: "bg-green-100 text-green-700 border-green-200" },
  rejected: { label: "已禁用", color: "bg-red-100 text-red-700 border-red-200" },
  locked: { label: "已锁定", color: "bg-gray-100 text-gray-700 border-gray-300" },
};

type TabKey = "users" | "authReqs" | "ipWhitelist" | "adminLogs" | "groupLogs" | "stats";

export default function AdminPanel() {
  const [location, navigate] = useLocation();
  const searchStr = useSearch();
  const { user, isAdmin } = useAppAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "all">("all");
  const [resetTarget, setResetTarget] = useState<UserRow | null>(null);
  const [newPassword, setNewPassword] = useState("");

  // 从 URL 参数读取标签页，默认为 "users"
  const VALID_TABS: TabKey[] = ["users", "authReqs", "ipWhitelist", "adminLogs", "groupLogs", "stats"];
  const tabFromUrl = new URLSearchParams(searchStr).get("tab") as TabKey | null;
  const activeTab: TabKey = (tabFromUrl && VALID_TABS.includes(tabFromUrl)) ? tabFromUrl : "users";
  const setActiveTab = (tab: TabKey) => {
    navigate(`${location.split('?')[0]}?tab=${tab}`, { replace: true });
  };
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState({
    username: "",
    password: "",
    email: "",
    authCode: "",
    remark: "",
  });

  // 解锁弹窗状态
  const [unlockTarget, setUnlockTarget] = useState<UserRow | null>(null);
  const [unlockNewAuthCode, setUnlockNewAuthCode] = useState("");

  // IP 白名单添加状态
  const [newIp, setNewIp] = useState("");
  const [newIpRemark, setNewIpRemark] = useState("");

  // 删除账号弹窗状态
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);

  // 活动记录弹窗状态
  const [activityTarget, setActivityTarget] = useState<UserRow | null>(null);
  const [activityTab, setActivityTab] = useState<"devices" | "checks" | "authReqs">("devices");

  // 创建管理员弹窗状态
  const [showCreateAdminDialog, setShowCreateAdminDialog] = useState(false);
  const [createAdminForm, setCreateAdminForm] = useState({
    username: "",
    password: "",
    email: "",
    authCode: "",
    ownerAuthCode: "",
    remark: "",
  });

  // 操作日志分页状态
  const [logsPage, setLogsPage] = useState(1);
  const [logsActionFilter, setLogsActionFilter] = useState<string | undefined>(undefined);
  // 月度统计年月选择（默认当前月）
  const [statsYear, setStatsYear] = useState(() => new Date().getFullYear());
  const [statsMonth, setStatsMonth] = useState(() => new Date().getMonth() + 1);

  const utils = trpc.useUtils();

  const { data: adminData, isLoading, refetch } = trpc.appAuth.adminListUsers.useQuery(undefined, {
    enabled: isAdmin,
    refetchInterval: 30000,
  });
  const userList: UserRow[] = (adminData as any)?.users || [];

  const { data: authReqData, refetch: refetchAuthReqs } = trpc.appAuth.adminListAuthRequests.useQuery(undefined, {
    enabled: isAdmin,
    refetchInterval: 15000,
  });
  const allAuthReqs: AuthReqRow[] = (authReqData as any) || [];

  const { data: ipWhitelistData, refetch: refetchIpWhitelist } = trpc.appAuth.adminListIpWhitelist.useQuery(undefined, {
    enabled: isAdmin,
    refetchInterval: 30000,
  });
  const ipWhitelistRows: IpWhitelistRow[] = (ipWhitelistData as any) || [];

  const resetPasswordMutation = trpc.appAuth.adminResetPassword.useMutation({
    onSuccess: () => {
      toast.success("密码已重置");
      setResetTarget(null);
      setNewPassword("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const createUserMutation = trpc.appAuth.adminCreateUser.useMutation({
    onSuccess: (data: any) => {
      toast.success(data.message || "账号创建成功");
      setShowCreateDialog(false);
      setCreateForm({ username: "", password: "", email: "", authCode: "", remark: "" });
      utils.appAuth.adminListUsers.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const unlockUserMutation = trpc.appAuth.adminUnlockUser.useMutation({
    onSuccess: (data: any) => {
      toast.success(data.message || "账号已解锁，新授权码已设置");
      setUnlockTarget(null);
      setUnlockNewAuthCode("");
      utils.appAuth.adminListUsers.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleUserMutation = trpc.appAuth.adminToggleUser.useMutation({
    onSuccess: () => {
      toast.success("操作成功");
      utils.appAuth.adminListUsers.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const addIpMutation = trpc.appAuth.adminAddIp.useMutation({
    onSuccess: (data: any) => {
      toast.success(data.message || "IP 已添加到白名单");
      setNewIp("");
      setNewIpRemark("");
      utils.appAuth.adminListIpWhitelist.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const removeIpMutation = trpc.appAuth.adminRemoveIp.useMutation({
    onSuccess: () => {
      toast.success("IP 已从白名单移除");
      utils.appAuth.adminListIpWhitelist.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteUserMutation = trpc.appAuth.adminDeleteUser.useMutation({
    onSuccess: (data: any) => {
      toast.success(data.message || "账号已删除");
      setDeleteTarget(null);
      utils.appAuth.adminListUsers.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  // 查询用户活动记录
  const { data: activityData, isLoading: activityLoading } = trpc.appAuth.adminGetUserActivity.useQuery(
    { userId: activityTarget?.id ?? 0, limit: 100 },
    { enabled: !!activityTarget }
  );

  // 操作日志查询
  const { data: logsData, isLoading: logsLoading, refetch: refetchLogs } = trpc.appAuth.adminGetLogs.useQuery(
    { page: logsPage, pageSize: 50, action: logsActionFilter },
    { enabled: isAdmin && activeTab === "adminLogs" }
  );

  // 分组操作日志查询
  const { data: groupLogsData, isLoading: groupLogsLoading, refetch: refetchGroupLogs } = trpc.scheduled.getGroupOperationLogs.useQuery(
    undefined,
    { enabled: isAdmin && activeTab === "groupLogs" }
  );

  // 月度统计查询
  const { data: statsData, isLoading: statsLoading } = trpc.appAuth.adminGetMonthlyStats.useQuery(
    { year: statsYear, month: statsMonth },
    { enabled: isAdmin && activeTab === "stats" }
  );
  // 趋势图月数选择（默认 6 个月）
  const [trendMonths, setTrendMonths] = useState(6);
  // 趋势图视图：summary=汇总折线，users=按用户折线
  const [trendView, setTrendView] = useState<"summary" | "users">("summary");
  // 趋势数据查询
  const { data: trendData, isLoading: trendLoading } = trpc.appAuth.adminGetTrendStats.useQuery(
    { months: trendMonths },
    { enabled: isAdmin && activeTab === "stats" }
  );
  // 用户检测详情弹窗状态
  const [checkDetailTarget, setCheckDetailTarget] = useState<UserRow | null>(null);
  const [checkDetailPage, setCheckDetailPage] = useState(1);
  const [checkDetailDate, setCheckDetailDate] = useState<string>(""); // YYYY-MM-DD，空字符串表示全部
  const [checkDetailMonth, setCheckDetailMonth] = useState<string>(""); // YYYY-MM，空字符串表示全部
  // 检测详情查询
  const { data: checkDetailData, isLoading: checkDetailLoading } = trpc.appAuth.adminGetUserCheckDetail.useQuery(
    { userId: checkDetailTarget?.id ?? 0, page: checkDetailPage, pageSize: 50, date: checkDetailDate || undefined, month: (!checkDetailDate && checkDetailMonth) ? checkDetailMonth : undefined },
    { enabled: !!checkDetailTarget }
  );
  // 切换月份的辅助函数
  const goPrevMonth = () => {
    if (statsMonth === 1) { setStatsYear(y => y - 1); setStatsMonth(12); }
    else setStatsMonth(m => m - 1);
  };
  const goNextMonth = () => {
    const now = new Date();
    if (statsYear > now.getFullYear() || (statsYear === now.getFullYear() && statsMonth >= now.getMonth() + 1)) return;
    if (statsMonth === 12) { setStatsYear(y => y + 1); setStatsMonth(1); }
    else setStatsMonth(m => m + 1);
  };

  const createAdminMutation = trpc.appAuth.adminCreateAdmin.useMutation({
    onSuccess: (data: any) => {
      toast.success(data.message || "管理员账号创建成功");
      setShowCreateAdminDialog(false);
      setCreateAdminForm({ username: "", password: "", email: "", authCode: "", ownerAuthCode: "", remark: "" });
      utils.appAuth.adminListUsers.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 rounded bg-muted flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-foreground font-medium mb-1">无权访问管理后台</p>
          <p className="text-sm text-muted-foreground mb-4">仅管理员和站长可访问此页面</p>
          <Button variant="outline" onClick={() => navigate("/")}>
            返回首页
          </Button>
        </div>
      </div>
    );
  }

  const filtered = userList.filter((u: UserRow) => {
    const matchSearch = !search || u.username.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || u.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const activeCount = userList.filter((u: UserRow) => u.status === "active").length;
  const lockedCount = userList.filter((u: UserRow) => u.status === "locked").length;
  const totalChecks = (adminData as any)?.totalChecks ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <AppNav activeTab="admin" />

      <div className="max-w-6xl mx-auto px-4 py-6">
        {lockedCount > 0 && (
          <div
            className="bg-amber-50 border border-amber-200 rounded p-4 mb-4 flex items-start gap-3 cursor-pointer hover:bg-amber-100/80 transition-colors"
            onClick={() => { setStatusFilter("locked"); setActiveTab("users"); }}
          >
            <Lock className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">有 {lockedCount} 个账号因授权码错误被锁定</p>
              <p className="text-xs text-amber-600 mt-0.5">点击此处查看并解锁（解锁时需为用户设置新授权码）</p>
            </div>
            <span className="text-xs text-amber-500 flex-shrink-0">点击查看 →</span>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-card border border-border rounded p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <span className="text-xs text-muted-foreground">已激活用户</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{activeCount}</div>
          </div>
          <div className="bg-card border border-border rounded p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded bg-amber-500/10 flex items-center justify-center">
                <Lock className="w-4 h-4 text-amber-500" />
              </div>
              <span className="text-xs text-muted-foreground">已锁定账号</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{lockedCount}</div>
          </div>
          <div className="bg-card border border-border rounded p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center">
                <BarChart2 className="w-4 h-4 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground">总检测次数</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{totalChecks}</div>
          </div>
        </div>

        <div className="flex gap-1 mb-4 bg-muted p-1 rounded w-fit overflow-x-auto">
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === "users" ? "bg-background text-foreground " : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="w-4 h-4" />
            用户管理
            {lockedCount > 0 && (
              <span className="bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full leading-none">{lockedCount}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("authReqs")}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === "authReqs" ? "bg-background text-foreground " : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            登录记录
          </button>
          <button
            onClick={() => setActiveTab("ipWhitelist")}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === "ipWhitelist" ? "bg-background text-foreground " : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Globe className="w-4 h-4" />
            IP 白名单
            <span className="bg-muted-foreground/60 text-background text-xs px-1.5 py-0.5 rounded-full leading-none">{ipWhitelistRows.length}</span>
          </button>
          <button
            onClick={() => setActiveTab("adminLogs")}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === "adminLogs" ? "bg-background text-foreground " : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="w-4 h-4" />
            操作日志
          </button>
          <button
            onClick={() => setActiveTab("groupLogs")}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === "groupLogs" ? "bg-background text-foreground " : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Activity className="w-4 h-4" />
            分组日志
          </button>
          <button
            onClick={() => setActiveTab("stats")}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === "stats" ? "bg-background text-foreground " : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            数据统计
          </button>
        </div>

        {activeTab === "users" && (
          <div className="bg-card rounded border border-border ">
            <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="搜索用户名..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {(["all", "active", "locked", "rejected"] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                      statusFilter === s ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {s === "all" ? "全部" : STATUS_LABEL[s].label}
                  </button>
                ))}
                <button onClick={() => refetch()} className="p-1.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                  <RefreshCw className="w-4 h-4" />
                </button>
                <Button
                  size="sm"
                  className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-500"
                  onClick={() => setShowCreateDialog(true)}
                >
                  <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                  创建账号
                </Button>
                {user?.isOwner && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-3 text-xs border-purple-200 text-purple-700 hover:bg-purple-50"
                    onClick={() => setShowCreateAdminDialog(true)}
                  >
                    <Shield className="w-3.5 h-3.5 mr-1.5" />
                    创建管理员
                  </Button>
                )}
              </div>
            </div>

            {isLoading ? (
              <div className="py-16 text-center text-slate-400">
                <div className="w-6 h-6 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
                加载中...
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>暂无用户</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">用户名</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">状态</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">邮箱</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">检测</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">最近活跃</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">创建时间</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((u: UserRow) => (
                      <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                              {u.username[0].toUpperCase()}
                            </div>
                            <span className="font-medium text-slate-800">{u.username}</span>
                            {u.isOwner && (
                              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded font-medium">站长</span>
                            )}
                            {u.role === "admin" && !u.isOwner && (
                              <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs rounded font-medium">管理员</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_LABEL[u.status]?.color || "bg-slate-100 text-slate-700 border-slate-200"}`}>
                            {u.status === "locked" && <Lock className="w-3 h-3 mr-1" />}
                            {STATUS_LABEL[u.status]?.label || u.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">
                          {u.email || <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            className="font-mono font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                            onClick={() => { setCheckDetailTarget(u); setCheckDetailPage(1); setCheckDetailDate(""); }}
                            title="点击查看检测详情"
                          >
                            {u.checkCount}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {u.lastActiveAt ? (() => {
                            const diff = Date.now() - new Date(u.lastActiveAt).getTime();
                            const mins = Math.floor(diff / 60000);
                            const hours = Math.floor(mins / 60);
                            const days = Math.floor(hours / 24);
                            if (mins < 1) return <span className="text-green-600 font-medium" title={new Date(u.lastActiveAt).toLocaleString("zh-CN")}>刚刚</span>;
                            if (mins < 60) return <span className={mins < 30 ? "text-green-600" : "text-slate-500"} title={new Date(u.lastActiveAt).toLocaleString("zh-CN")}>{mins}分钟前</span>;
                            if (hours < 24) return <span className="text-slate-500" title={new Date(u.lastActiveAt).toLocaleString("zh-CN")}>{hours}小时前</span>;
                            if (days < 7) return <span className="text-slate-400" title={new Date(u.lastActiveAt).toLocaleString("zh-CN")}>{days}天前</span>;
                            if (days < 30) return <span className="text-amber-500" title={new Date(u.lastActiveAt).toLocaleString("zh-CN")}>{days}天前</span>;
                            return <span className="text-red-400" title={new Date(u.lastActiveAt).toLocaleString("zh-CN")}>{days}天前</span>;
                          })() : <span className="text-slate-300">从未登录</span>}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs">
                          {new Date(u.createdAt).toLocaleDateString("zh-CN")}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            {u.status === "locked" && u.role !== "admin" && (
                              <Button
                                size="sm"
                                className="h-7 px-2.5 text-xs bg-blue-600 hover:bg-blue-500"
                                onClick={() => { setUnlockTarget(u); setUnlockNewAuthCode(""); }}
                                disabled={unlockUserMutation.isPending}
                              >
                                <Lock className="w-3.5 h-3.5 mr-1" />
                                解锁
                              </Button>
                            )}
                            {u.role !== "admin" && u.status === "active" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2.5 text-xs border-red-200 text-red-600 hover:bg-red-50"
                                onClick={() => toggleUserMutation.mutate({ userId: u.id, action: "disable" })}
                                disabled={toggleUserMutation.isPending}
                              >
                                <XCircle className="w-3.5 h-3.5 mr-1" />
                                禁用
                              </Button>
                            )}
                            {u.role !== "admin" && u.status === "rejected" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2.5 text-xs"
                                onClick={() => toggleUserMutation.mutate({ userId: u.id, action: "enable" })}
                                disabled={toggleUserMutation.isPending}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                启用
                              </Button>
                            )}
                            {u.role !== "admin" && (
                              <button
                                onClick={() => { setResetTarget(u); setNewPassword(""); }}
                                className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                title="重置密码"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {/* 查看记录按鈕（对所有非站长用户可见） */}
                            {!u.isOwner && (
                              <button
                                onClick={() => { setActivityTarget(u); setActivityTab("devices"); }}
                                className="p-1.5 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                title="查看活动记录"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {!u.isOwner && (
                              <button
                                onClick={() => setDeleteTarget(u)}
                                className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                title="删除账号"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "authReqs" && (
          <div className="bg-card rounded border border-border ">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">异常登录记录</h3>
                <p className="text-xs text-muted-foreground mt-0.5">用户在新设备或新 IP 登录时的授权码验证记录</p>
              </div>
              <button onClick={() => refetchAuthReqs()} className="p-1.5 rounded bg-muted text-muted-foreground hover:bg-muted/80 transition-colors" title="刷新记录">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            {allAuthReqs.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <ShieldAlert className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">暂无异常登录记录</p>
                <p className="text-xs mt-1 opacity-60">当用户在新设备或新 IP 登录时，记录会显示在这里</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">用户</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">IP 地址</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">设备指纹</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">状态</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allAuthReqs.map((r: AuthReqRow) => (
                      <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                              {r.username[0]?.toUpperCase() || "?"}
                            </div>
                            <span className="font-medium text-slate-800">{r.username}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Wifi className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-mono text-xs">{r.ip || "未知"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Monitor className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-mono text-xs">{r.deviceFingerprint?.slice(0, 12)}...</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                            r.status === "pending" ? "bg-amber-100 text-amber-700 border-amber-200" :
                            r.status === "approved" ? "bg-green-100 text-green-700 border-green-200" :
                            "bg-red-100 text-red-700 border-red-200"
                          }`}>
                            {r.status === "pending" ? "待处理" : r.status === "approved" ? "已通过" : "已拒绝"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs">
                          {new Date(r.requestedAt).toLocaleString("zh-CN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "ipWhitelist" && (
          <div className="bg-card rounded border border-border ">
            <div className="p-4 border-b border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-slate-800">IP 访问白名单</h3>
                  <p className="text-xs text-slate-500 mt-0.5">非站长用户须 IP 在白名单内才可访问系统</p>
                </div>
                <button onClick={() => refetchIpWhitelist()} className="p-1.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
              {/* 添加 IP 表单 */}
              <div className="flex gap-2">
                <Input
                  placeholder="IP 地址（如 192.168.1.1）"
                  value={newIp}
                  onChange={e => setNewIp(e.target.value)}
                  className="h-9 text-sm font-mono flex-1"
                />
                <Input
                  placeholder="备注（可选）"
                  value={newIpRemark}
                  onChange={e => setNewIpRemark(e.target.value)}
                  className="h-9 text-sm w-40"
                />
                <Button
                  size="sm"
                  className="h-9 px-3 bg-blue-600 hover:bg-blue-500"
                  disabled={!newIp.trim() || addIpMutation.isPending}
                  onClick={() => addIpMutation.mutate({ ip: newIp.trim(), remark: newIpRemark.trim() || undefined })}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  添加
                </Button>
              </div>
            </div>
            {ipWhitelistRows.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <Globe className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>白名单为空</p>
                <p className="text-xs mt-1">添加 IP 后，非站长用户才能访问系统</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">IP 地址</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">备注</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">添加时间</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ipWhitelistRows.map((row: IpWhitelistRow) => (
                      <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Wifi className="w-3.5 h-3.5 text-green-500" />
                            <span className="font-mono text-sm text-slate-800">{row.ip}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">
                          {row.remark || <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs">
                          {new Date(row.createdAt).toLocaleString("zh-CN")}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => {
                              if (confirm(`确定要从白名单中移除 ${row.ip} 吗？`)) {
                                removeIpMutation.mutate({ id: row.id });
                              }
                            }}
                            className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title="移除"
                            disabled={removeIpMutation.isPending}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 操作日志 Tab */}
        {activeTab === "adminLogs" && (
          <div className="bg-card rounded border border-border ">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-semibold text-slate-700">管理员操作日志</span>
                {logsData && <span className="text-xs text-slate-400">共 {logsData.total} 条</span>}
              </div>
              <div className="flex gap-2 flex-wrap items-center">
                <select
                  value={logsActionFilter || ""}
                  onChange={e => { setLogsActionFilter(e.target.value || undefined); setLogsPage(1); }}
                  className="h-8 px-2 text-xs rounded border border-slate-200 bg-white text-slate-600"
                >
                  <option value="">全部操作</option>
                  <option value="create_user">创建用户</option>
                  <option value="create_admin">创建管理员</option>
                  <option value="delete_user">删除用户</option>
                  <option value="unlock_user">解锁账号</option>
                  <option value="reset_password">重置密码</option>
                  <option value="add_ip">添加 IP</option>
                  <option value="remove_ip">移除 IP</option>
                </select>
                <button onClick={() => refetchLogs()} className="p-1.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>
            {logsLoading ? (
              <div className="py-16 text-center text-slate-400">
                <div className="w-6 h-6 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
                加载中...
              </div>
            ) : !logsData?.logs?.length ? (
              <div className="py-16 text-center text-slate-400">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>暂无操作日志</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">时间</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">操作人</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">操作类型</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">目标</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">IP</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">详情</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {logsData.logs.map((log: any) => {
                      const actionLabels: Record<string, { label: string; color: string }> = {
                        create_user: { label: "创建用户", color: "bg-green-100 text-green-700" },
                        create_admin: { label: "创建管理员", color: "bg-purple-100 text-purple-700" },
                        delete_user: { label: "删除用户", color: "bg-red-100 text-red-700" },
                        unlock_user: { label: "解锁账号", color: "bg-blue-100 text-blue-700" },
                        reset_password: { label: "重置密码", color: "bg-amber-100 text-amber-700" },
                        add_ip: { label: "添加 IP", color: "bg-teal-100 text-teal-700" },
                        remove_ip: { label: "移除 IP", color: "bg-orange-100 text-orange-700" },
                      };
                      const actionInfo = actionLabels[log.action] || { label: log.action, color: "bg-slate-100 text-slate-700" };
                      return (
                        <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString("zh-CN")}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-medium text-slate-700 text-sm">{log.operatorName}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${actionInfo.color}`}>
                              {actionInfo.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {log.targetName || <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-3 text-xs font-mono text-slate-400">
                            {log.ip || <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-400">
                            {log.detail ? JSON.stringify(log.detail).replace(/[{}"]|null/g, "").replace(/,/g, ", ") : <span className="text-slate-300">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {/* 分页 */}
            {logsData && logsData.total > 50 && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400">第 {logsPage} 页 / 共 {Math.ceil(logsData.total / 50)} 页</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setLogsPage(p => Math.max(1, p - 1))}
                    disabled={logsPage <= 1}
                    className="px-3 py-1.5 text-xs rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
                  >
                    上一页
                  </button>
                  <button
                    onClick={() => setLogsPage(p => p + 1)}
                    disabled={logsPage >= Math.ceil(logsData.total / 50)}
                    className="px-3 py-1.5 text-xs rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 分组操作日志 Tab */}
        {activeTab === "groupLogs" && (
          <div className="bg-card rounded border border-border ">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-semibold text-slate-700">分组操作日志</span>
                <span className="text-xs text-slate-400">近 7 天内的分组和域名增删记录</span>
                {groupLogsData && <span className="text-xs text-slate-400">(共 {groupLogsData.length} 条)</span>}
              </div>
              <button onClick={() => refetchGroupLogs()} className="p-1.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            {groupLogsLoading ? (
              <div className="py-16 text-center text-slate-400">
                <div className="w-6 h-6 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
                加载中...
              </div>
            ) : !groupLogsData?.length ? (
              <div className="py-16 text-center text-slate-400">
                <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>暂无分组操作日志</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">时间</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">操作人</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">操作类型</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">分组名称</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">分组类别</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">域名 / 详情</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {groupLogsData.map((log: any) => {
                      const actionLabels: Record<string, { label: string; color: string }> = {
                        create_group: { label: "创建分组", color: "bg-green-100 text-green-700" },
                        delete_group: { label: "删除分组", color: "bg-red-100 text-red-700" },
                        add_domain: { label: "添加域名", color: "bg-blue-100 text-blue-700" },
                        remove_domain: { label: "删除域名", color: "bg-orange-100 text-orange-700" },
                      };
                      const actionInfo = actionLabels[log.action] || { label: log.action, color: "bg-slate-100 text-slate-700" };
                      let detailText = "";
                      if (log.action === "add_domain" && log.detail?.domains?.length > 1) {
                        detailText = `批量添加 ${log.detail.domains.length} 个，跳过 ${log.detail.skipped ?? 0} 个`;
                      } else if (log.action === "delete_group" && log.detail?.domainCount !== undefined) {
                        detailText = `包含 ${log.detail.domainCount} 个域名`;
                      } else if (log.action === "create_group" && log.detail?.tool) {
                        detailText = `工具: ${log.detail.tool}`;
                      }
                      return (
                        <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-medium text-slate-700 text-sm">{log.operatorName}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${actionInfo.color}`}>
                              {actionInfo.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700 font-medium">
                            {log.groupName || <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            {log.groupCategory ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                {log.groupCategory}
                              </span>
                            ) : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">
                            {log.domainName ? (
                              <span className="font-mono text-blue-600">{log.domainName}</span>
                            ) : detailText ? (
                              <span className="text-slate-400">{detailText}</span>
                            ) : <span className="text-slate-300">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 数据统计 Tab */}
        {activeTab === "stats" && (
          <div className="space-y-6">

            {/* Telegram 测试推送卡片 */}
            <TelegramTestCard />

              {/* 域名库预警设置卡片 */}
            <LowStockSettingsCard />

            {/* Telegram 群组-站点映射配置卡片 */}
            <TelegramChatMappingCard />

            {/* SEO 关键词监听配置卡片 */}
            <SeoKeywordConfigCard />

            {/* SEO 通知文案配置卡片 */}
            <SeoNotifyTemplateCard />

            {/* 告警消息模板编辑卡片 */}
            <AlertTemplateCard />

            {/* 折线图区域：按月趋势 */}
            <div className="bg-white rounded border border-slate-200  overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-semibold text-slate-700">按月趋势</span>
                  <span className="text-xs text-slate-400">（每用户检测次数折线图）</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* 月数选择 */}
                  <div className="flex items-center gap-1">
                    {([3, 6, 12] as const).map(n => (
                      <button
                        key={n}
                        onClick={() => setTrendMonths(n)}
                        className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                          trendMonths === n ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        近{n}月
                      </button>
                    ))}
                  </div>

                </div>
              </div>
              <div className="p-4">
                {trendLoading ? (
                  <div className="h-64 flex items-center justify-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin mr-3" />
                    加载趋势数据...
                  </div>
                ) : !trendData?.monthList?.length ? (
                  <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                    <BarChart2 className="w-10 h-10 mb-3 opacity-30" />
                    <p className="text-sm">暂无趋势数据</p>
                    <p className="text-xs mt-1 text-slate-300">有用户进行检测操作后将在此显示</p>
                  </div>
                ) : (() => {
                  const COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899", "#84cc16"];
                  const monthList = trendData.monthList as string[];
                  const userTrends = trendData.userTrends as any[];
                  const summaryTrend = trendData.summaryTrend as any[];

                  // 汇总视图：每月合计检测次数
                  const summaryChartData = monthList.map((month: string) => {
                    const s = summaryTrend.find((d: any) => d.month === month);
                    return { month, "合计检测": s ? Number(s.checks) : 0 };
                  });

                  // 按用户视图：每个用户每月检测次数
                  const usersChartData = monthList.map((month: string) => {
                    const point: Record<string, string | number> = { month };
                    userTrends.forEach((u: any) => {
                      const d = u.data.find((x: any) => x.month === month);
                      point[u.username] = d ? Number(d.checks) : 0;
                    });
                    return point;
                  });

                  const isSummaryView = trendView === "summary";
                  const chartData = isSummaryView ? summaryChartData : usersChartData;
                  const hasSummaryData = summaryTrend.some((d: any) => Number(d.checks) > 0);

                  return (
                    <div>
                      {/* 视图切换按鈕 */}
                      <div className="flex items-center gap-1 mb-3">
                        <button
                          onClick={() => setTrendView("summary")}
                          className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                            trendView === "summary" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          合计
                        </button>
                        <button
                          onClick={() => setTrendView("users")}
                          className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                            trendView === "users" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          按用户
                        </button>
                      </div>
                      {!hasSummaryData ? (
                        <div className="h-56 flex flex-col items-center justify-center text-slate-400">
                          <BarChart2 className="w-10 h-10 mb-3 opacity-30" />
                          <p className="text-sm">所选时间范围内暂无检测数据</p>
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height={260}>
                          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis
                              dataKey="month"
                              tick={{ fontSize: 11, fill: "#94a3b8" }}
                              tickLine={false}
                              axisLine={{ stroke: "#e2e8f0" }}
                            />
                            <YAxis
                              tick={{ fontSize: 11, fill: "#94a3b8" }}
                              tickLine={false}
                              axisLine={false}
                              allowDecimals={false}
                              domain={[0, 'auto']}
                            />
                            <Tooltip
                              contentStyle={{
                                background: "#fff",
                                border: "1px solid #e2e8f0",
                                borderRadius: "8px",
                                fontSize: "12px",
                                boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                              }}
                              formatter={(value: number, name: string) => [`${value} 次`, name]}
                            />
                            <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                            {isSummaryView ? (
                              <Line
                                type="monotone"
                                dataKey="合计检测"
                                name="合计检测次数"
                                stroke="#3b82f6"
                                strokeWidth={2.5}
                                dot={{ r: 4, fill: "#3b82f6", strokeWidth: 0 }}
                                activeDot={{ r: 6 }}
                                connectNulls
                              />
                            ) : (
                              userTrends.map((u: any, idx: number) => (
                                <Line
                                  key={u.username}
                                  type="monotone"
                                  dataKey={u.username}
                                  name={`${u.username}`}
                                  stroke={COLORS[idx % COLORS.length]}
                                  strokeWidth={2}
                                  dot={{ r: 3 }}
                                  activeDot={{ r: 5 }}
                                  connectNulls
                                />
                              ))
                            )}
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* 月度明细表格 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-semibold text-slate-700">月度数据统计</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={goPrevMonth}
                  className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 transition-colors"
                  title="上一个月"
                >
                  ‹
                </button>
                <span className="px-3 py-1 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded min-w-[90px] text-center">
                  {statsYear}年{String(statsMonth).padStart(2, '0')}月
                </span>
                <button
                  onClick={goNextMonth}
                  disabled={(() => { const now = new Date(); return statsYear > now.getFullYear() || (statsYear === now.getFullYear() && statsMonth >= now.getMonth() + 1); })()}
                  className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  title="下一个月"
                >
                  ›
                </button>
              </div>
            </div>
            {statsLoading ? (
              <div className="py-16 text-center text-slate-400">
                <div className="w-6 h-6 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
                加载中...
              </div>
            ) : !statsData?.monthSummary?.length ? (
              <div className="py-16 text-center text-slate-400">
                <BarChart2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>暂无统计数据</p>
              </div>
            ) : (
              statsData.monthSummary.map((monthData: any) => (
                <div key={monthData.month} className="bg-white rounded border border-slate-200  overflow-hidden">
                  {/* 月度汇总标题行 */}
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-800 text-base">{monthData.month}</span>
                      <span className="text-xs text-slate-400">{monthData.activeUsers} 人活跃</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1.5">
                        <BarChart2 className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-slate-500 text-xs">检测</span>
                        <span className="font-bold text-blue-600">{monthData.totalChecks}</span>
                      </div>
                    </div>
                  </div>
                  {/* 每人明细 */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-400">用户名</th>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-400">角色</th>
                          <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-400">检测次数</th>

                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {monthData.persons.map((person: any) => (
                          <tr key={person.userId} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-2.5 font-medium text-slate-700">{person.username}</td>
                            <td className="px-4 py-2.5">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                person.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-600"
                              }`}>
                                {person.role === "admin" ? "管理员" : "用户"}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono text-blue-600">{person.checks}</td>

                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>
      {/* 解锁账号弹窗（需设置新授权码） */}
      <Dialog open={!!unlockTarget} onOpenChange={(open) => !open && setUnlockTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-blue-600" />
              解锁账号
            </DialogTitle>
            <DialogDescription className="sr-only">解锁用户账号并设置新授权码</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-slate-500">
              为用户 <span className="font-semibold text-slate-700">{unlockTarget?.username}</span> 解锁账号
            </p>
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-3">
              解锁后账号状态保持锁定，用户须使用您设置的新授权码才能完成登录验证并解除锁定。
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">新授权码 <span className="text-red-500">*</span></Label>
              <Input
                type="text"
                placeholder="至少 6 位"
                value={unlockNewAuthCode}
                onChange={e => setUnlockNewAuthCode(e.target.value)}
              />
              <p className="text-xs text-slate-400">请将此授权码告知用户，用户下次登录时需输入</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnlockTarget(null)}>取消</Button>
            <Button
              disabled={unlockNewAuthCode.length < 6 || unlockUserMutation.isPending}
              onClick={() => {
                if (!unlockTarget) return;
                unlockUserMutation.mutate({ userId: unlockTarget.id, newAuthCode: unlockNewAuthCode });
              }}
            >
              {unlockUserMutation.isPending ? "处理中..." : "确认解锁"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 创建账号弹窗 */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => !open && setShowCreateDialog(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-600" />
              创建下级账号
            </DialogTitle>
            <DialogDescription className="sr-only">创建新的下级用户账号</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-slate-500 bg-blue-50 border border-blue-100 rounded p-3">
              账号创建后直接激活，首次登录需输入授权码绑定 IP 和设备。授权码输入错误将锁定账号。
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">用户名 <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="3-32位字母数字"
                  value={createForm.username}
                  onChange={e => setCreateForm(f => ({ ...f, username: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">密码 <span className="text-red-500">*</span></Label>
                <Input
                  type="text"
                  placeholder="至少6位"
                  value={createForm.password}
                  onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">邮箱 <span className="text-red-500">*</span></Label>
              <Input
                type="email"
                placeholder="用于账号标识"
                value={createForm.email}
                onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">授权码 <span className="text-red-500">*</span></Label>
              <Input
                type="text"
                placeholder="至少6位，不可与密码/用户名相同"
                value={createForm.authCode}
                onChange={e => setCreateForm(f => ({ ...f, authCode: e.target.value }))}
              />
              <p className="text-xs text-slate-400">首次登录时需输入此授权码，输入错误账号将被锁定</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">备注（可选）</Label>
              <Input
                placeholder="账号用途说明"
                value={createForm.remark}
                onChange={e => setCreateForm(f => ({ ...f, remark: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>取消</Button>
            <Button
              disabled={
                !createForm.username || !createForm.password || !createForm.email || !createForm.authCode ||
                createForm.password.length < 6 || createForm.authCode.length < 6 ||
                createUserMutation.isPending
              }
              onClick={() => createUserMutation.mutate({
                username: createForm.username,
                password: createForm.password,
                email: createForm.email,
                authCode: createForm.authCode,
                remark: createForm.remark || undefined,
              })}
            >
              {createUserMutation.isPending ? "创建中..." : "创建账号"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除账号确认弹窗 */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              删除账号
            </DialogTitle>
            <DialogDescription className="sr-only">确认删除用户账号</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-slate-600">
              确定要删除用户 <span className="font-semibold text-slate-800">{deleteTarget?.username}</span> 的账号吗？
            </p>
            <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-3">
              此操作不可撤销！将同时删除该用户的所有登录记录、设备绑定和检测记录。
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button
              variant="destructive"
              disabled={deleteUserMutation.isPending}
              onClick={() => {
                if (!deleteTarget) return;
                deleteUserMutation.mutate({ userId: deleteTarget.id });
              }}
            >
              {deleteUserMutation.isPending ? "删除中..." : "确认删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 创建管理员弹窗（需验证站长授权码） */}
      <Dialog open={showCreateAdminDialog} onOpenChange={(open) => !open && setShowCreateAdminDialog(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-600" />
              创建管理员账号
            </DialogTitle>
            <DialogDescription className="sr-only">创建新的管理员账号</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-slate-500 bg-purple-50 border border-purple-100 rounded p-3">
              管理员拥有管理后台访问权限。创建时需输入您的站长授权码进行验证。
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">用户名 <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="3-32位字母数字"
                  value={createAdminForm.username}
                  onChange={e => setCreateAdminForm(f => ({ ...f, username: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">密码 <span className="text-red-500">*</span></Label>
                <Input
                  type="text"
                  placeholder="至少6位"
                  value={createAdminForm.password}
                  onChange={e => setCreateAdminForm(f => ({ ...f, password: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">邮箱 <span className="text-red-500">*</span></Label>
              <Input
                type="email"
                placeholder="用于账号标识"
                value={createAdminForm.email}
                onChange={e => setCreateAdminForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">管理员授权码 <span className="text-red-500">*</span></Label>
              <Input
                type="text"
                placeholder="至少6位，不可与密码/用户名相同"
                value={createAdminForm.authCode}
                onChange={e => setCreateAdminForm(f => ({ ...f, authCode: e.target.value }))}
              />
              <p className="text-xs text-slate-400">管理员首次登录时需输入此授权码，输入错误账号将被锁定</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">站长授权码（验证） <span className="text-red-500">*</span></Label>
              <Input
                type="password"
                placeholder="输入您自己的站长授权码"
                value={createAdminForm.ownerAuthCode}
                onChange={e => setCreateAdminForm(f => ({ ...f, ownerAuthCode: e.target.value }))}
              />
              <p className="text-xs text-slate-400">用于验证您的站长身份，不会被保存</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">备注（可选）</Label>
              <Input
                placeholder="账号用途说明"
                value={createAdminForm.remark}
                onChange={e => setCreateAdminForm(f => ({ ...f, remark: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateAdminDialog(false)}>取消</Button>
            <Button
              className="bg-purple-600 hover:bg-purple-500"
              disabled={
                !createAdminForm.username || !createAdminForm.password || !createAdminForm.email ||
                !createAdminForm.authCode || !createAdminForm.ownerAuthCode ||
                createAdminForm.password.length < 6 || createAdminForm.authCode.length < 6 ||
                createAdminMutation.isPending
              }
              onClick={() => createAdminMutation.mutate({
                username: createAdminForm.username,
                password: createAdminForm.password,
                email: createAdminForm.email,
                authCode: createAdminForm.authCode,
                ownerAuthCode: createAdminForm.ownerAuthCode,
                remark: createAdminForm.remark || undefined,
              })}
            >
              {createAdminMutation.isPending ? "创建中..." : "创建管理员"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 重置密码弹窗 */}
      <Dialog open={!!resetTarget} onOpenChange={(open) => !open && setResetTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>重置密码</DialogTitle>
            <DialogDescription className="sr-only">重置用户登录密码</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-slate-500">
              为用户 <span className="font-semibold text-slate-700">{resetTarget?.username}</span> 设置新密码
            </p>
            <div className="space-y-1.5">
              <Label className="text-sm">新密码</Label>
              <Input
                type="text"
                placeholder="至少 6 位"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetTarget(null)}>取消</Button>
            <Button
              disabled={newPassword.length < 6 || resetPasswordMutation.isPending}
              onClick={async () => {
                if (!resetTarget) return;
                await resetPasswordMutation.mutateAsync({ userId: resetTarget.id, newPassword });
              }}
            >
              {resetPasswordMutation.isPending ? "重置中..." : "确认重置"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 用户活动记录弹窗 */}
      <Dialog open={!!activityTarget} onOpenChange={(open) => !open && setActivityTarget(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              {activityTarget?.username} 的活动记录
              {activityTarget?.role === "admin" && !activityTarget?.isOwner && (
                <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs rounded font-medium">管理员</span>
              )}
            </DialogTitle>
            <DialogDescription className="sr-only">用户活动记录详情</DialogDescription>
          </DialogHeader>

          {/* 内容区域（可滚动） */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {activityLoading ? (
              <div className="py-16 text-center text-slate-400">
                <div className="w-6 h-6 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
                加载中...
              </div>
            ) : (
              <div className="space-y-4 py-2">
                {/* 用户基本信息卡片 */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-blue-50 border border-blue-100 rounded p-3 text-center">
                    <div className="text-2xl font-bold text-blue-600">{(activityData as any)?.stats?.totalChecks ?? 0}</div>
                    <div className="text-xs text-slate-500 mt-1">检测次数</div>
                  </div>
                  <div className="bg-green-50 border border-green-100 rounded p-3 text-center">
                    <div className="text-2xl font-bold text-green-600">{(activityData as any)?.stats?.deviceCount ?? 0}</div>
                    <div className="text-xs text-slate-500 mt-1">绑定设备数</div>
                  </div>
                </div>

                {/* 内容 Tab */}
                <div className="flex gap-1 bg-slate-100 p-1 rounded w-fit">
                  {([
                    { key: "devices", label: "登录 IP", icon: <Wifi className="w-3.5 h-3.5" /> },
                    { key: "checks", label: "检测记录", icon: <BarChart2 className="w-3.5 h-3.5" /> },
                    { key: "authReqs", label: "异常登录", icon: <ShieldAlert className="w-3.5 h-3.5" /> },
                  ] as const).map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setActivityTab(tab.key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                        activityTab === tab.key ? "bg-white text-slate-800 " : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {tab.icon}{tab.label}
                    </button>
                  ))}
                </div>

                {/* 登录 IP 历史 */}
                {activityTab === "devices" && (
                  <div className="bg-white rounded border border-slate-200">
                    {!(activityData as any)?.devices?.length ? (
                      <div className="py-8 text-center text-slate-400 text-sm">暂无登录记录</div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50/50">
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">IP 地址</th>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">设备指纹</th>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">绑定类型</th>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">绑定时间</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(activityData as any)?.devices?.map((d: any) => (
                            <tr key={d.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-1.5">
                                  <Wifi className="w-3.5 h-3.5 text-green-500" />
                                  <span className="font-mono text-xs text-slate-800">{d.ip || "未知"}</span>
                                </div>
                              </td>
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-1.5">
                                  <Monitor className="w-3.5 h-3.5 text-slate-400" />
                                  <span className="font-mono text-xs text-slate-500">{d.deviceFingerprint?.slice(0, 16)}...</span>
                                </div>
                              </td>
                              <td className="px-4 py-2.5">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                                  d.bindType === "first" ? "bg-blue-100 text-blue-700 border-blue-200" : "bg-amber-100 text-amber-700 border-amber-200"
                                }`}>
                                  {d.bindType === "first" ? "首次登录" : "异常验证"}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-xs text-slate-400">
                                {d.approvedAt ? new Date(d.approvedAt).toLocaleString("zh-CN") : "未知"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* 检测记录 */}
                {activityTab === "checks" && (
                  <div className="bg-white rounded border border-slate-200">
                    {!(activityData as any)?.checks?.length ? (
                      <div className="py-8 text-center text-slate-400 text-sm">暂无检测记录</div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50/50">
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">域名</th>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">工具</th>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">检测时间</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(activityData as any)?.checks?.map((c: any) => (
                            <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-1.5">
                                  <Globe className="w-3.5 h-3.5 text-blue-400" />
                                  <span className="font-mono text-xs text-slate-800">{c.domain}</span>
                                </div>
                              </td>
                              <td className="px-4 py-2.5">
                                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{c.tool}</span>
                              </td>
                              <td className="px-4 py-2.5 text-xs text-slate-400">
                                {new Date(c.createdAt).toLocaleString("zh-CN")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}


                {/* 异常登录记录 */}
                {activityTab === "authReqs" && (
                  <div className="bg-white rounded border border-slate-200">
                    {!(activityData as any)?.authRequests?.length ? (
                      <div className="py-8 text-center text-slate-400 text-sm">暂无异常登录记录</div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50/50">
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">IP 地址</th>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">设备指纹</th>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">状态</th>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">请求时间</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(activityData as any)?.authRequests?.map((r: any) => (
                            <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-1.5">
                                  <Wifi className="w-3.5 h-3.5 text-slate-400" />
                                  <span className="font-mono text-xs text-slate-800">{r.ip || "未知"}</span>
                                </div>
                              </td>
                              <td className="px-4 py-2.5">
                                <span className="font-mono text-xs text-slate-500">{r.deviceFingerprint?.slice(0, 16)}...</span>
                              </td>
                              <td className="px-4 py-2.5">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                                  r.status === "pending" ? "bg-amber-100 text-amber-700 border-amber-200" :
                                  r.status === "approved" ? "bg-green-100 text-green-700 border-green-200" :
                                  "bg-red-100 text-red-700 border-red-200"
                                }`}>
                                  {r.status === "pending" ? "待处理" : r.status === "approved" ? "已通过" : "已拒绝"}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-xs text-slate-400">
                                {new Date(r.requestedAt).toLocaleString("zh-CN")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 检测详情弹窗 */}
      <Dialog open={!!checkDetailTarget} onOpenChange={(open) => { if (!open) { setCheckDetailTarget(null); setCheckDetailDate(""); setCheckDetailMonth(""); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-blue-500" />
              {checkDetailTarget?.username} 的检测记录
              {checkDetailDate ? (
                <span className="text-sm font-normal text-blue-500">{checkDetailDate} 共 {checkDetailData?.total ?? "..."} 条</span>
              ) : checkDetailMonth ? (
                <span className="text-sm font-normal text-blue-500">{checkDetailMonth} 共 {checkDetailData?.total ?? "..."} 条</span>
              ) : (
                <span className="text-sm font-normal text-slate-400">（全部共 {checkDetailTarget?.checkCount} 条）</span>
              )}
            </DialogTitle>
            <DialogDescription className="sr-only">用户检测记录详情</DialogDescription>
          </DialogHeader>

          {/* 筛选栏 */}
          <div className="py-2 border-b border-slate-100 space-y-1.5">
            {/* 第一行：月份 + 按天 + 清除 */}
            <div className="flex flex-wrap items-center gap-3">
              {/* 月份下拉选择器 */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500 shrink-0">月份：</span>
                <select
                  value={checkDetailMonth}
                  onChange={e => { setCheckDetailMonth(e.target.value); setCheckDetailDate(""); setCheckDetailPage(1); }}
                  className="text-sm border border-slate-200 rounded px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                >
                  <option value="">全部</option>
                  {(() => {
                    const now = new Date();
                    const options = [];
                    for (let i = 0; i < 12; i++) {
                      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                      options.push(<option key={val} value={val}>{val}</option>);
                    }
                    return options;
                  })()}
                </select>
              </div>

              {/* 按天筛选 */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500 shrink-0">按天：</span>
                <input
                  type="date"
                  value={checkDetailDate}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={e => { setCheckDetailDate(e.target.value); setCheckDetailMonth(""); setCheckDetailPage(1); }}
                  className="text-sm border border-slate-200 rounded px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>

              {(checkDetailDate || checkDetailMonth) && (
                <button
                  onClick={() => { setCheckDetailDate(""); setCheckDetailMonth(""); setCheckDetailPage(1); }}
                  className="text-xs text-slate-400 hover:text-slate-600 underline"
                >
                  清除筛选
                </button>
              )}
            </div>

            {/* 第二行：日期快捷按鈕（独立一行，避免与表格列头重叠） */}
            {checkDetailData?.dailyStats && checkDetailData.dailyStats.length > 0 && (
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                <span className="text-xs text-slate-400 shrink-0">快捷：</span>
                {checkDetailData.dailyStats.slice(0, 14).map((d: { date: string; count: number }) => (
                  <button
                    key={d.date}
                    onClick={() => { setCheckDetailDate(d.date); setCheckDetailMonth(""); setCheckDetailPage(1); }}
                    className={`shrink-0 text-xs px-1.5 py-0.5 rounded border transition-colors ${
                      checkDetailDate === d.date
                        ? "bg-blue-500 text-white border-blue-500"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600"
                    }`}
                    title={`${d.date}: ${d.count} 条`}
                  >
                    {d.date.slice(5)} <span className="text-[10px] opacity-70">{d.count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-auto">
            {checkDetailLoading ? (
              <div className="flex items-center justify-center py-12 text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin mr-2" />加载中...
              </div>
            ) : !checkDetailData?.items?.length ? (
              <div className="text-center py-12 text-slate-400">
                {checkDetailDate ? `${checkDetailDate} 无检测记录` : "暂无检测记录"}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-400">域名</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-400">工具</th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-slate-400">检测时间</th>
                  </tr>
                </thead>
                <tbody>
                  {checkDetailData.items.map((item: any) => (
                    <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="px-3 py-2 font-mono text-xs text-slate-700">{item.domain}</td>
                      <td className="px-3 py-2">
                        <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-xs rounded font-medium">{item.tool}</span>
                      </td>
                      <td className="px-3 py-2 text-right text-xs text-slate-400">
                        {new Date(item.createdAt).toLocaleString("zh-CN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {checkDetailData && checkDetailData.totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-400">第 {checkDetailPage}/{checkDetailData.totalPages} 页，共 {checkDetailData.total} 条</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={checkDetailPage <= 1} onClick={() => setCheckDetailPage(p => p - 1)}>上一页</Button>
                <Button size="sm" variant="outline" disabled={checkDetailPage >= checkDetailData.totalPages} onClick={() => setCheckDetailPage(p => p + 1)}>下一页</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>


    </div>
  );
}

// ── Telegram 测试推送卡片 ──────────────────────────────────────────────────────
function TelegramTestCard() {
  const sendTest = trpc.scheduled.sendTelegramTest.useMutation();
  const registerWebhook = trpc.scheduled.registerTelegramWebhook.useMutation();
  const webhookInfo = trpc.scheduled.getTelegramWebhookInfo.useQuery();

  const handleSend = async () => {
    try {
      const result = await sendTest.mutateAsync();
      if (result.successCount === result.totalCount) {
        toast.success(`测试消息已成功发送到全部 ${result.totalCount} 个目标`);
      } else if (result.successCount > 0) {
        toast.warning(`部分发送成功：${result.successCount}/${result.totalCount} 个目标收到消息`);
      } else {
        toast.error(`发送失败：${result.errors.join('；')}`);
      }
    } catch (e: any) {
      toast.error(`发送失败：${e.message}`);
    }
  };

  const handleRegisterWebhook = async () => {
    const webhookUrl = `${window.location.origin}/api/telegram/webhook`;
    try {
      const result = await registerWebhook.mutateAsync({ webhookUrl });
      if (result.ok) {
        toast.success(`Webhook 注册成功！地址：${webhookUrl}`);
        webhookInfo.refetch();
      } else {
        toast.error(`Webhook 注册失败：${result.error}`);
      }
    } catch (e: any) {
      toast.error(`注册失败：${e.message}`);
    }
  };

  const currentWebhookUrl = (webhookInfo.data as any)?.url ?? '';
  const hasCallbackQuery = (webhookInfo.data as any)?.allowed_updates?.includes('callback_query') ?? false;

  return (
    <div className="bg-white rounded border border-slate-200  overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
        <MessageCircle className="w-4 h-4 text-blue-500" />
        <span className="text-sm font-semibold text-slate-700">Telegram 告警推送</span>
      </div>
      <div className="px-4 py-4 space-y-4">
        {/* Webhook 状态显示 */}
        {webhookInfo.data && (
          <div className="text-xs text-slate-500 bg-slate-50 rounded p-3 space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-600">Webhook URL：</span>
              <span className="font-mono truncate max-w-xs text-slate-700">{currentWebhookUrl || '未配置'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-600">callback_query 支持：</span>
              {hasCallbackQuery ? (
                <span className="text-emerald-600 font-medium">✅ 已开启（分组删除已确认按鈕可用）</span>
              ) : (
                <span className="text-red-500 font-medium">❌ 未开启（请点击重新注册 Webhook）</span>
              )}
            </div>
          </div>
        )}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm text-slate-700">
              当定时检测发现<span className="font-semibold text-red-600">质量极差</span>的域名时，系统将自动推送告警消息到已配置的 Telegram 用户和群组。
            </p>
            <p className="text-xs text-slate-400">
              分组删除预警的「已确认」按鈕需要 Webhook 支持 callback_query，如果显示未开启，请点击「重新注册 Webhook」。
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              onClick={handleRegisterWebhook}
              disabled={registerWebhook.isPending}
              variant="outline"
              className="flex items-center gap-2 border-slate-300 text-slate-700 hover:bg-slate-50 bg-white"
            >
              {registerWebhook.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-400/30 border-t-slate-600 rounded-full animate-spin" />
                  注册中...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  重新注册 Webhook
                </>
              )}
            </Button>
            <Button
              onClick={handleSend}
              disabled={sendTest.isPending}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {sendTest.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  发送中...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  发送测试消息
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 域名库预警设置卡片（阈值 + 冷却时间 + 重置冷却） ────────────────────────────────
function LowStockSettingsCard() {
  const utils = trpc.useUtils();
  const { data: allSettings, isLoading } = trpc.settings.getAll.useQuery();
  const { data: cooldownStatus } = trpc.settings.getLowStockCooldownStatus.useQuery();

  const setMut = trpc.settings.set.useMutation({
    onSuccess: (_data: any, variables: any) => {
      const label = variables.key === "low_stock_threshold" ? "阈值" : "冷却时间";
      toast.success(`${label}已保存`);
      utils.settings.getAll.invalidate();
      setEditingThreshold(false);
      setEditingCooldown(false);
    },
    onError: (e: any) => toast.error("保存失败：" + e.message),
  });

  const resetCooldownMut = trpc.settings.resetLowStockCooldown.useMutation({
    onSuccess: () => {
      toast.success("冷却记录已清除，下次标记时将重新检查库存");
      utils.settings.getLowStockCooldownStatus.invalidate();
    },
    onError: (e: any) => toast.error("清除失败：" + e.message),
  });

  const currentThreshold = allSettings?.["low_stock_threshold"] ?? "3";
  const currentCooldown = allSettings?.["low_stock_cooldown_hours"] ?? "3";
  const cooldownRecordCount = cooldownStatus?.records?.length ?? 0;

  const [editingThreshold, setEditingThreshold] = React.useState(false);
  const [editingCooldown, setEditingCooldown] = React.useState(false);
  const [thresholdVal, setThresholdVal] = React.useState("");
  const [cooldownVal, setCooldownVal] = React.useState("");

  const handleSaveThreshold = () => {
    const n = parseInt(thresholdVal, 10);
    if (isNaN(n) || n < 1 || n > 999) { toast.error("请输入 1~999 之间的整数"); return; }
    setMut.mutate({ key: "low_stock_threshold", value: String(n) });
  };

  const handleSaveCooldown = () => {
    const n = parseInt(cooldownVal, 10);
    if (isNaN(n) || n < 1 || n > 720) { toast.error("请输入 1~720 之间的整数（小时）"); return; }
    setMut.mutate({ key: "low_stock_cooldown_hours", value: String(n) });
  };

  return (
    <div className="bg-white rounded border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
        <Settings2 className="w-4 h-4 text-slate-500" />
        <span className="text-sm font-semibold text-slate-700">域名库预警设置</span>
      </div>
      <div className="px-4 py-4 space-y-4">

        {/* 阈值设置行 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-slate-700">低库存阈值</p>
            <p className="text-xs text-slate-400">
              剩余域名数量 &lt; <span className="font-mono font-semibold text-slate-600">{isLoading ? "…" : currentThreshold}</span> 条时触发告警
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {editingThreshold ? (
              <>
                <Input type="number" min={1} max={999} value={thresholdVal}
                  onChange={e => setThresholdVal(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSaveThreshold()}
                  className="w-20 h-8 text-sm text-center" autoFocus />
                <span className="text-xs text-slate-400">条</span>
                <Button size="sm" onClick={handleSaveThreshold} disabled={setMut.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-3">
                  {setMut.isPending ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "保存"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingThreshold(false)}
                  className="h-8 px-3 border-slate-300 text-slate-600">取消</Button>
              </>
            ) : (
              <Button size="sm" variant="outline"
                onClick={() => { setThresholdVal(currentThreshold); setEditingThreshold(true); }}
                className="flex items-center gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-50 bg-white h-8">
                <Settings2 className="w-3.5 h-3.5" />修改
              </Button>
            )}
          </div>
        </div>

        <div className="border-t border-slate-100" />

        {/* 冷却时间设置行 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-slate-700">告警冷却时间</p>
            <p className="text-xs text-slate-400">
              同一厂商触发告警后，<span className="font-mono font-semibold text-slate-600">{isLoading ? "…" : currentCooldown}</span> 小时内不重复推送
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {editingCooldown ? (
              <>
                <Input type="number" min={1} max={720} value={cooldownVal}
                  onChange={e => setCooldownVal(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSaveCooldown()}
                  className="w-20 h-8 text-sm text-center" autoFocus />
                <span className="text-xs text-slate-400">小时</span>
                <Button size="sm" onClick={handleSaveCooldown} disabled={setMut.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-3">
                  {setMut.isPending ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "保存"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingCooldown(false)}
                  className="h-8 px-3 border-slate-300 text-slate-600">取消</Button>
              </>
            ) : (
              <Button size="sm" variant="outline"
                onClick={() => { setCooldownVal(currentCooldown); setEditingCooldown(true); }}
                className="flex items-center gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-50 bg-white h-8">
                <Settings2 className="w-3.5 h-3.5" />修改
              </Button>
            )}
          </div>
        </div>

        <div className="border-t border-slate-100" />

        {/* 重置冷却行 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-slate-700">清除冷却记录</p>
            <p className="text-xs text-slate-400">
              {cooldownRecordCount > 0
                ? <span>当前有 <span className="font-mono font-semibold text-amber-600">{cooldownRecordCount}</span> 个厂商处于冷却期，清除后下次标记将重新检查库存</span>
                : "当前没有厂商处于冷却期"
              }
            </p>
          </div>
          <Button
            size="sm" variant="outline"
            onClick={() => resetCooldownMut.mutate()}
            disabled={resetCooldownMut.isPending || cooldownRecordCount === 0}
            className="flex items-center gap-1.5 border-red-200 text-red-600 hover:bg-red-50 bg-white h-8 shrink-0"
          >
            {resetCooldownMut.isPending
              ? <div className="w-3.5 h-3.5 border-2 border-red-300/30 border-t-red-500 rounded-full animate-spin" />
              : <RefreshCw className="w-3.5 h-3.5" />
            }
            清除冷却记录
          </Button>
        </div>

      </div>
    </div>
  );
}


// ── 告警消息模板管理（多类型，默认折叠，可停用） ───────────────────────────────

// 三种告警类型的静态定义（与后端 ALERT_TYPE_DEFS 保持一致）
const ALERT_TYPE_DEFS = [
  {
    id: "low_stock",
    label: "低库存告警",
    description: "厂商域名库某类别剩余数量低于阈值时触发",
    templateKey: "low_stock_alert_template",
    disabledKey: "low_stock_alert_disabled",
    defaultTemplate: `⚠️ *域名库库存预警*

🏢 厂商：{{vendor}}
📦 以下类别剩余数量小于 {{threshold}} 条：
{{items}}
⏰ 告警时间：{{time}}

📌 请尽快补充对应厂商的域名库，避免生成时无域名可用。`,
    variables: [
      { name: "{{vendor}}", desc: "厂商名称" },
      { name: "{{threshold}}", desc: "当前阈值（条）" },
      { name: "{{items}}", desc: "低库存类别列表" },
      { name: "{{time}}", desc: "告警时间" },
    ],
    sampleVars: {
      vendor: "示例厂商",
      threshold: "3",
      items: "  • 主推：剩余 *2* 条\n  • 备用：剩余 *1* 条",
      time: new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }),
    },
  },
  {
    id: "quality_alert",
    label: "域名质量告警",
    description: "定时检测发现质量差（poor/bad）域名时触发",
    templateKey: "quality_alert_template",
    disabledKey: "quality_alert_disabled",
    defaultTemplate: `🔴 域名质量告警

📁 分组：{{group}}
🏷 类别：{{category}}
🌐 域名：{{domain}}
📊 质量：{{quality}}
⚠️ 问题：失败节点 {{failedNodes}}/{{totalNodes}} ({{failRate}})，平均响应 {{avgTime}}
🔖 评级依据：{{ratingMode}}
🔧 检测工具：{{tool}}
⏰ 检测时间：{{time}}

⚠️ 域名值班人员请注意：该域名检测异常，麻烦尽快处理！！！

备注：直接回复本消息域名工具箱后台会自动更换异常域名，域名同步频道仍然需要同事手动处理 @jskfymzb01
回复格式：
新域名：https://www.新域名.vip:端口`,
    variables: [
      { name: "{{group}}", desc: "分组名称" },
      { name: "{{category}}", desc: "类别标签" },
      { name: "{{domain}}", desc: "域名" },
      { name: "{{quality}}", desc: "质量等级" },
      { name: "{{failedNodes}}", desc: "失败节点数" },
      { name: "{{totalNodes}}", desc: "总节点数" },
      { name: "{{failRate}}", desc: "失败率" },
      { name: "{{avgTime}}", desc: "平均响应时间" },
      { name: "{{ratingMode}}", desc: "评级依据" },
      { name: "{{tool}}", desc: "检测工具" },
      { name: "{{time}}", desc: "检测时间" },
    ],
    sampleVars: {
      group: "A1分组",
      category: "主推",
      domain: "example.com",
      quality: "极差",
      failedNodes: "120",
      totalNodes: "144",
      failRate: "120/144 (83%)",
      avgTime: "8.50s",
      ratingMode: "📐 系统默认规则",
      tool: "ITDOG",
      time: new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }),
    },
  },
  {
    id: "permanent_failure",
    label: "域名永久失效告警",
    description: "域名连续多轮检测全部失败（循环重置超过 5 次）时触发",
    templateKey: "permanent_failure_alert_template",
    disabledKey: "permanent_failure_alert_disabled",
    defaultTemplate: `☠️ *域名永久失效告警*

📁 *分组*：{{group}}
🏷️ *类别*：{{category}}
🌐 *域名*：\`{{domain}}\`
🔧 *检测工具*：{{tool}}
🔁 *失败循环次数*：{{failureCycles}} 次（已超过 5 次阈值）
⏰ *告警时间*：{{time}}

⚠️ 该域名已连续多轮检测全部失败，可能已永久失效或无法访问。
请值班人员尽快核查并处理！`,
    variables: [
      { name: "{{group}}", desc: "分组名称" },
      { name: "{{category}}", desc: "类别标签" },
      { name: "{{domain}}", desc: "域名" },
      { name: "{{tool}}", desc: "检测工具" },
      { name: "{{failureCycles}}", desc: "失败循环次数" },
      { name: "{{time}}", desc: "告警时间" },
    ],
    sampleVars: {
      group: "A1分组",
      category: "主推",
      domain: "example.com",
      tool: "ITDOG",
      failureCycles: "6",
      time: new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }),
    },
  },
  // 4. 检测工具健康监控告警
  {
    id: "tool_health_alert",
    label: "检测工具健康监控告警",
    description: "ITDOG/阿里云/炸了么全部连续失败时触发",
    templateKey: "tool_health_alert_template",
    disabledKey: "tool_health_alert_disabled",
    chatIdsKey: "tool_health_alert_chat_ids",
    defaultTemplate: `⚠️ *检测工具健康告警*
🔧 失败工具：{{failedTools}}
🚨 是否全郠失败：{{allFailed}}
⏰ 告警时间：{{time}}
⚠️ 以上工具连续探针失败，请尽快排查工具可用性！`,
    variables: [
      { name: "{{failedTools}}", desc: "失败工具列表" },
      { name: "{{allFailed}}", desc: "是否全郠失败" },
      { name: "{{time}}", desc: "告警时间" },
    ],
    sampleVars: {
      failedTools: "ITDOG, 阿里云, 炸了么",
      allFailed: "是",
      time: new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }),
    },
  },
  // 5. SEO 预热失败告警
  {
    id: "preheat_fail_alert",
    label: "SEO 预热失败告警",
    description: "某分类连续 3 次预热失败时触发，提醒补充库存",
    templateKey: "preheat_fail_alert_template",
    disabledKey: "preheat_fail_alert_disabled",
    chatIdsKey: "preheat_fail_alert_chat_ids",
    defaultTemplate: `🔥 *SEO 域名预热失败告警*
📌 站点类型：{{siteType}}
🏷️ 分类：{{category}}
🔄 连续失败：{{threshold}} 次
⏰ 告警时间：{{time}}
⚠️ 该分类库存不足或域名质量差，请尽快补充对应分类的库存域名！`,
    variables: [
      { name: "{{siteType}}", desc: "站点类型（如 A1）" },
      { name: "{{category}}", desc: "分类名称" },
      { name: "{{threshold}}", desc: "连续失败次数" },
      { name: "{{time}}", desc: "告警时间" },
    ],
    sampleVars: {
      siteType: "A1",
      category: "主推",
      threshold: "3",
      time: new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }),
    },
  },
] as const;

type AlertTypeDef = typeof ALERT_TYPE_DEFS[number];

function renderTemplatePreview(template: string, sampleVars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => sampleVars[key] ?? `{{${key}}}`);
}

// ── 单个告警类型的折叠面板 ────────────────────────────────────────────────────
function AlertTypePanel({
  def,
  allSettings,
  isLoadingSettings,
}: {
  def: AlertTypeDef;
  allSettings: Record<string, string> | undefined;
  isLoadingSettings: boolean;
}) {
  const utils = trpc.useUtils();
  const [expanded, setExpanded] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [draftVal, setDraftVal] = React.useState("");
  const [showPreview, setShowPreview] = React.useState(false);
  const [showHistory, setShowHistory] = React.useState(false);
  const [diffTarget, setDiffTarget] = React.useState<{ id: number; value: string } | null>(null);
  // 群组绑定相关状态
  const chatIdsKey = (def as any).chatIdsKey as string | undefined;
  const [editingChatIds, setEditingChatIds] = React.useState(false);
  const [draftChatIds, setDraftChatIds] = React.useState("");
  const [testSending, setTestSending] = React.useState(false);

  const currentTemplate = allSettings?.[def.templateKey] ?? def.defaultTemplate;
  const isDisabled = allSettings?.[def.disabledKey] === "true";
  const isDefault = currentTemplate === def.defaultTemplate;
  const currentChatIds = chatIdsKey ? (allSettings?.[chatIdsKey] ?? "") : "";

  const { data: historyData, refetch: refetchHistory } = trpc.settings.getHistory.useQuery(
    { key: def.templateKey },
    { enabled: false }
  );

  const setMut = trpc.settings.set.useMutation({
    onSuccess: () => {
      toast.success("模板已保存");
      utils.settings.getAll.invalidate();
      setEditing(false);
      setShowPreview(false);
    },
    onError: (e: any) => toast.error("保存失败：" + e.message),
  });

  const resetMut = trpc.settings.resetToDefault.useMutation({
    onSuccess: () => {
      toast.success("模板已恢复为默认值");
      utils.settings.getAll.invalidate();
      setEditing(false);
      setShowPreview(false);
      refetchHistory();
    },
    onError: (e: any) => toast.error("重置失败：" + e.message),
  });

  const restoreMut = trpc.settings.restoreFromHistory.useMutation({
    onSuccess: () => {
      toast.success("已恢复到该历史版本");
      utils.settings.getAll.invalidate();
      setShowHistory(false);
      refetchHistory();
    },
    onError: (e: any) => toast.error("恢复失败：" + e.message),
  });

  const toggleDisabled = () => {
    setMut.mutate({ key: def.disabledKey, value: isDisabled ? "false" : "true" });
  };

  const handleEdit = () => {
    setDraftVal(currentTemplate);
    setEditing(true);
    setShowPreview(false);
    setShowHistory(false);
  };

  const handleSave = () => {
    setMut.mutate({ key: def.templateKey, value: draftVal });
  };

  const handleShowHistory = () => {
    setShowHistory(true);
    setEditing(false);
    setShowPreview(false);
    refetchHistory();
  };

  // 群组绑定存储
  const handleSaveChatIds = () => {
    if (!chatIdsKey) return;
    setMut.mutate({ key: chatIdsKey, value: draftChatIds }, {
      onSuccess: () => {
        toast.success("群组绑定已保存");
        setEditingChatIds(false);
      },
    });
  };

  // 测试通知发送
  const sendTestMut = trpc.settings.sendTestAlert.useMutation({
    onSuccess: (data: any) => {
      setTestSending(false);
      if (data.successCount > 0) {
        toast.success(`测试通知已发送到 ${data.successCount}/${data.totalCount} 个群组`);
      } else {
        toast.error(`所有群组发送失败: ${data.errors?.join(", ")}`);
      }
    },
    onError: (e: any) => {
      setTestSending(false);
      toast.error("测试发送失败：" + e.message);
    },
  });

  const handleTestSend = () => {
    if (!chatIdsKey) return;
    const alertType = def.id as "tool_health_alert" | "preheat_fail_alert";
    setTestSending(true);
    sendTestMut.mutate({ alertType });
  };

  const historyRecords = historyData?.records ?? [];
  const sampleVars = def.sampleVars as Record<string, string>;

  return (
    <div className={`border rounded overflow-hidden transition-all ${isDisabled ? "border-slate-200 opacity-60" : "border-slate-200"}`}>
      {/* 折叠头部 */}
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-700">{def.label}</span>
              {isDisabled && (
                <span className="text-xs bg-red-50 text-red-500 border border-red-100 px-1.5 py-0.5 rounded">已停用</span>
              )}
              {!isDisabled && !isDefault && (
                <span className="text-xs bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.5 rounded">已自定义</span>
              )}
              {!isDisabled && isDefault && (
                <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">默认</span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{def.description}</p>
          </div>
        </div>
        {/* 停用开关（阻止冒泡，避免触发折叠） */}
        <div
          className="flex items-center gap-1.5 flex-shrink-0"
          onClick={e => e.stopPropagation()}
        >
          <span className="text-xs text-slate-500">{isDisabled ? "已停用" : "已启用"}</span>
          <button
            type="button"
            onClick={toggleDisabled}
            disabled={setMut.isPending}
            className={`transition-colors ${isDisabled ? "text-slate-300 hover:text-slate-400" : "text-green-500 hover:text-green-600"}`}
            title={isDisabled ? "点击启用此告警" : "点击停用此告警"}
          >
            {isDisabled ? (
              <ToggleLeft className="w-6 h-6" />
            ) : (
              <ToggleRight className="w-6 h-6" />
            )}
          </button>
        </div>
      </button>

      {/* 展开内容 */}
      {expanded && (
        <div className="px-4 py-4 space-y-3 bg-white">
          {/* 操作按钮行 */}
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-1.5">
              {def.variables.map((v: { name: string; desc: string }) => (
                <span key={v.name}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-100 rounded text-xs text-blue-700 font-mono cursor-default"
                  title={v.desc}>
                  {v.name}
                  <span className="font-sans text-blue-500 font-normal">= {v.desc}</span>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
              {!editing && !isDefault && (
                <Button size="sm" variant="outline" onClick={() => resetMut.mutate({ key: def.templateKey })} disabled={resetMut.isPending}
                  className="h-7 px-2.5 text-xs border-slate-300 text-slate-600 hover:bg-slate-50 bg-white">
                  {resetMut.isPending ? <div className="w-3 h-3 border-2 border-slate-300/30 border-t-slate-500 rounded-full animate-spin" /> : "恢复默认"}
                </Button>
              )}
              {!editing && (
                <Button size="sm" variant="outline" onClick={handleShowHistory}
                  className="h-7 px-2.5 text-xs flex items-center gap-1 border-slate-300 text-slate-600 hover:bg-slate-50 bg-white">
                  <Activity className="w-3 h-3" />历史
                </Button>
              )}
              {!editing && (
                <Button size="sm" variant="outline" onClick={handleEdit}
                  className="h-7 px-2.5 text-xs flex items-center gap-1 border-slate-300 text-slate-700 hover:bg-slate-50 bg-white">
                  <Settings2 className="w-3 h-3" />编辑
                </Button>
              )}
            </div>
          </div>

          {/* 编辑模式 */}
          {editing && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-600">编辑模板</span>
                <button
                  type="button"
                  onClick={() => setShowPreview(p => !p)}
                  className={`text-xs px-2 py-0.5 rounded border transition-colors ${showPreview ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"}`}>
                  {showPreview ? "隐藏预览" : "预览效果"}
                </button>
              </div>
              <div className={`grid gap-3 ${showPreview ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
                <div className="space-y-1">
                  {showPreview && <p className="text-xs text-slate-400 font-medium">模板内容</p>}
                  <Textarea
                    value={draftVal}
                    onChange={e => setDraftVal(e.target.value)}
                    rows={10}
                    className="font-mono text-xs resize-y border-slate-300 focus:border-blue-400"
                    placeholder="输入消息模板，使用 {{变量名}} 插入动态内容…"
                  />
                </div>
                {showPreview && (
                  <div className="space-y-1">
                    <p className="text-xs text-slate-400 font-medium">预览效果（模拟数据）</p>
                    <div className="bg-slate-800 rounded p-3 min-h-[10rem] max-h-64 overflow-y-auto">
                      <pre className="text-xs text-slate-100 whitespace-pre-wrap font-mono leading-relaxed">
                        {renderTemplatePreview(draftVal, sampleVars) || <span className="text-slate-500">（模板为空）</span>}
                      </pre>
                    </div>
                    <p className="text-xs text-slate-400">* 使用模拟数据渲染，实际推送内容以真实数据为准</p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={() => { setEditing(false); setShowPreview(false); }}
                  className="h-8 px-3 border-slate-300 text-slate-600">取消</Button>
                <Button size="sm" onClick={handleSave} disabled={setMut.isPending}
                  className="h-8 px-4 bg-blue-600 hover:bg-blue-700 text-white">
                  {setMut.isPending ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "保存模板"}
                </Button>
              </div>
            </div>
          )}

          {/* 历史记录面板 */}
          {showHistory && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600">修改历史（最近 50 条）</span>
                <button type="button" onClick={() => { setShowHistory(false); setDiffTarget(null); }}
                  className="text-xs text-slate-400 hover:text-slate-600">关闭</button>
              </div>
              {historyRecords.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">暂无历史记录</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {historyRecords.map((rec: any) => (
                    <div key={rec.id} className="border border-slate-100 rounded overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 bg-slate-50">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 font-mono">
                            {new Date(rec.createdAt).toLocaleString("zh-CN")}
                          </span>
                          <span className="text-xs text-slate-400">by {rec.operator}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button type="button"
                            onClick={() => setDiffTarget(diffTarget?.id === rec.id ? null : { id: rec.id, value: rec.newValue })}
                            className={`text-xs px-2 py-0.5 rounded border transition-colors ${diffTarget?.id === rec.id ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
                            {diffTarget?.id === rec.id ? "收起" : "查看"}
                          </button>
                          <button type="button"
                            onClick={() => restoreMut.mutate({ historyId: rec.id })}
                            disabled={restoreMut.isPending}
                            className="text-xs px-2 py-0.5 rounded border bg-white border-amber-200 text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-50">
                            恢复此版本
                          </button>
                        </div>
                      </div>
                      {diffTarget?.id === rec.id && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border-t border-slate-100">
                          {rec.oldValue !== null && (
                            <div className="p-3 border-r border-slate-100 bg-red-50/30">
                              <p className="text-xs text-red-400 font-medium mb-1">变更前</p>
                              <pre className="text-xs text-slate-600 whitespace-pre-wrap font-mono leading-relaxed max-h-40 overflow-y-auto">
                                {rec.oldValue}
                              </pre>
                            </div>
                          )}
                          <div className={`p-3 bg-green-50/30 ${rec.oldValue === null ? "col-span-2" : ""}`}>
                            <p className="text-xs text-green-600 font-medium mb-1">变更后（此版本）</p>
                            <pre className="text-xs text-slate-600 whitespace-pre-wrap font-mono leading-relaxed max-h-40 overflow-y-auto">
                              {rec.newValue}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 默认预览（非编辑、非历史模式） */}
          {!editing && !showHistory && (
            <pre className="text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded p-3 whitespace-pre-wrap font-mono leading-relaxed max-h-56 overflow-y-auto">
              {isLoadingSettings ? "加载中…" : currentTemplate}
            </pre>
          )}

          {/* 群组绑定 + 测试发送（仅对支持 chatIdsKey 的告警类型展示） */}
          {chatIdsKey && (
            <div className="border-t border-slate-100 pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600">群组绑定</span>
                <div className="flex items-center gap-1.5">
                  {!editingChatIds && (
                    <Button size="sm" variant="outline"
                      onClick={() => { setDraftChatIds(currentChatIds); setEditingChatIds(true); }}
                      className="h-6 px-2 text-xs border-slate-300 text-slate-600 hover:bg-slate-50 bg-white">
                      编辑群组
                    </Button>
                  )}
                  <Button size="sm" variant="outline"
                    onClick={handleTestSend}
                    disabled={testSending || sendTestMut.isPending || !currentChatIds.trim()}
                    className="h-6 px-2 text-xs border-green-200 text-green-700 hover:bg-green-50 bg-white disabled:opacity-50">
                    {testSending ? (
                      <><div className="w-3 h-3 border-2 border-green-300/30 border-t-green-600 rounded-full animate-spin mr-1" />发送中</>
                    ) : (
                      <><Send className="w-3 h-3 mr-1" />测试通知</>
                    )}
                  </Button>
                </div>
              </div>
              {editingChatIds ? (
                <div className="space-y-1.5">
                  <Textarea
                    value={draftChatIds}
                    onChange={e => setDraftChatIds(e.target.value)}
                    rows={3}
                    className="font-mono text-xs resize-none border-slate-300 focus:border-blue-400"
                    placeholder="输入 Telegram 群组 ID，每行一个，例如：-1001234567890"
                  />
                  <p className="text-xs text-slate-400">支持多个群组，每行一个。空白时回退到系统默认群组。</p>
                  <div className="flex items-center gap-2 justify-end">
                    <Button size="sm" variant="outline"
                      onClick={() => setEditingChatIds(false)}
                      className="h-7 px-2.5 text-xs border-slate-300 text-slate-600">取消</Button>
                    <Button size="sm"
                      onClick={handleSaveChatIds}
                      disabled={setMut.isPending}
                      className="h-7 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white">
                      {setMut.isPending ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "保存"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-100 rounded p-2">
                  {currentChatIds.trim() ? (
                    <div className="space-y-0.5">
                      {currentChatIds.split(/[,\n]/).filter(s => s.trim()).map((id, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                          <span className="font-mono text-xs text-slate-600">{id.trim()}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">未配置专属群组，将使用系统默认群组</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Telegram 群组-站点映射配置卡片 ─────────────────────────────────────────────
interface MappingRow {
  id: number;
  chatId: number;
  chatName: string;
  siteType: string;
  enabled: boolean;
  replyText: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function TelegramChatMappingCard() {
  const utils = trpc.useUtils();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editTarget, setEditTarget] = useState<MappingRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MappingRow | null>(null);
  const [form, setForm] = useState({ chatId: '', chatName: '', siteType: 'A1', enabled: true, replyText: '' });

  const { data: mappings = [], isLoading, refetch } = trpc.seo.listMappings.useQuery();

  const addMutation = trpc.seo.addMapping.useMutation({
    onSuccess: () => {
      toast.success('映射已添加');
      setShowAddDialog(false);
      setForm({ chatId: '', chatName: '', siteType: 'A1', enabled: true, replyText: '' });
      utils.seo.listMappings.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateMutation = trpc.seo.updateMapping.useMutation({
    onSuccess: () => {
      toast.success('映射已更新');
      setEditTarget(null);
      utils.seo.listMappings.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = trpc.seo.deleteMapping.useMutation({
    onSuccess: () => {
      toast.success('映射已删除');
      setDeleteTarget(null);
      utils.seo.listMappings.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const batchToggleMutation = trpc.seo.batchToggleMappings.useMutation({
    onSuccess: (_data, variables) => {
      toast.success(variables.enabled ? '已全部启用' : '已全部禁用');
      utils.seo.listMappings.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleAdd = () => {
    const chatIdNum = parseInt(form.chatId, 10);
    if (isNaN(chatIdNum)) { toast.error('群组 ID 必须是数字'); return; }
    if (!form.chatName.trim()) { toast.error('请填写群组名称'); return; }
    addMutation.mutate({
      chatId: chatIdNum,
      chatName: form.chatName.trim(),
      siteType: form.siteType as any,
      enabled: form.enabled,
      replyText: form.replyText.trim() || undefined,
    });
  };

  const handleUpdate = () => {
    if (!editTarget) return;
    updateMutation.mutate({
      id: editTarget.id,
      chatName: form.chatName.trim() || undefined,
      siteType: form.siteType as any,
      enabled: form.enabled,
      replyText: form.replyText.trim() || undefined,
    });
  };

  const openEdit = (row: MappingRow) => {
    setEditTarget(row);
    setForm({ chatId: String(row.chatId), chatName: row.chatName, siteType: row.siteType, enabled: row.enabled, replyText: row.replyText ?? '' });
  };

  return (
    <div className="bg-white rounded border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Map className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-700">Telegram 群组-站点映射</span>
          <span className="text-xs text-slate-400">（配置哪个群组触发哪个站点的 SEO 换域）</span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1 text-green-600 border-green-200 hover:bg-green-50"
            onClick={() => batchToggleMutation.mutate({ enabled: true })}
            disabled={batchToggleMutation.isPending || (mappings as MappingRow[]).length === 0}
            title="将所有映射设为启用"
          >
            全部启用
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1 text-orange-600 border-orange-200 hover:bg-orange-50"
            onClick={() => batchToggleMutation.mutate({ enabled: false })}
            disabled={batchToggleMutation.isPending || (mappings as MappingRow[]).length === 0}
            title="将所有映射设为禁用"
          >
            全部禁用
          </Button>
          <Button size="sm" className="h-7 text-xs gap-1" onClick={() => { setForm({ chatId: '', chatName: '', siteType: 'A1', enabled: true, replyText: '' }); setShowAddDialog(true); }}>
            <Plus className="w-3 h-3" />
            添加映射
          </Button>
        </div>
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="text-center py-6 text-sm text-slate-400">加载中...</div>
        ) : (mappings as MappingRow[]).length === 0 ? (
          <div className="text-center py-6 text-sm text-slate-400">
            暂无映射配置，点击「添加映射」按钮新增
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 px-2 text-xs font-medium text-slate-500">群组 ID</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-slate-500">群组名称</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-slate-500">站点</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-slate-500">状态</th>
                          <th className="text-left py-2 px-2 text-xs font-medium text-slate-500">创建时间</th>
                  <th className="text-right py-2 px-2 text-xs font-medium text-slate-500">操作</th>
                </tr>
              </thead>
              <tbody>
                {(mappings as MappingRow[]).map(row => (
                  <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-2 px-2 font-mono text-xs text-slate-600">{row.chatId}</td>
                    <td className="py-2 px-2 text-slate-700">{row.chatName}</td>
                    <td className="py-2 px-2">
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">{row.siteType}</span>
                    </td>
                    <td className="py-2 px-2">
                      <button
                        onClick={() => updateMutation.mutate({ id: row.id, enabled: !row.enabled })}
                        disabled={updateMutation.isPending}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border transition-colors cursor-pointer ${
                          row.enabled
                            ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                        }`}
                        title={row.enabled ? '点击禁用' : '点击启用'}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${ row.enabled ? 'bg-green-500' : 'bg-gray-400' }`} />
                        {row.enabled ? '启用' : '禁用'}
                      </button>
                    </td>
                    <td className="py-2 px-2 text-xs text-slate-400">{new Date(row.createdAt).toLocaleDateString('zh-CN')}</td>
                    <td className="py-2 px-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-xs"
                          onClick={() => openEdit(row)}
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setDeleteTarget(row)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 添加/编辑弹窗 */}
      <Dialog open={showAddDialog || !!editTarget} onOpenChange={(open) => { if (!open) { setShowAddDialog(false); setEditTarget(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editTarget ? '编辑映射' : '添加群组-站点映射'}</DialogTitle>
            <DialogDescription>
              {editTarget ? '修改群组与站点的映射关系' : '将 Telegram 群组 ID 与 SEO 站点绑定，触发关键词时自动换域'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs text-slate-600">群组 ID（Telegram Chat ID，通常为负数）</Label>
              <Input
                className="mt-1 h-8 text-sm font-mono"
                placeholder="例如：-1001234567890"
                value={form.chatId}
                onChange={e => setForm(f => ({ ...f, chatId: e.target.value }))}
                disabled={!!editTarget}
              />
            </div>
            <div>
              <Label className="text-xs text-slate-600">群组名称（备注）</Label>
              <Input
                className="mt-1 h-8 text-sm"
                placeholder="例如：A1站SEO群"
                value={form.chatName}
                onChange={e => setForm(f => ({ ...f, chatName: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs text-slate-600">绑定站点</Label>
              <select
                className="mt-1 w-full h-8 text-sm border border-input rounded-md px-2 bg-background"
                value={form.siteType}
                onChange={e => setForm(f => ({ ...f, siteType: e.target.value }))}
              >
                {SITE_TYPES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="mapping-enabled"
                checked={form.enabled}
                onChange={e => setForm(f => ({ ...f, enabled: e.target.checked }))}
                className="w-4 h-4"
              />
              <Label htmlFor="mapping-enabled" className="text-xs text-slate-600 cursor-pointer">启用关键词监听</Label>
            </div>
            <p className="text-xs text-slate-400 bg-slate-50 rounded px-2 py-1.5">回复文案可在下方「SEO 通知文案配置」中统一管理</p>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setShowAddDialog(false); setEditTarget(null); }}>取消</Button>
            <Button
              size="sm"
              onClick={editTarget ? handleUpdate : handleAdd}
              disabled={addMutation.isPending || updateMutation.isPending}
            >
              {(addMutation.isPending || updateMutation.isPending) ? '保存中...' : (editTarget ? '保存修改' : '添加')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认弹窗 */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>确认删除映射</DialogTitle>
            <DialogDescription>
              确定要删除群组「{deleteTarget?.chatName}」（ID: {deleteTarget?.chatId}）与站点 {deleteTarget?.siteType} 的映射吗？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteTarget && deleteMutation.mutate({ id: deleteTarget.id })}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── 告警消息模板管理主卡片 ────────────────────────────────────────────────────
function AlertTemplateCard() {
  const { data: allSettings, isLoading } = trpc.settings.getAll.useQuery();

  return (
    <div className="bg-white rounded border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
        <MessageCircle className="w-4 h-4 text-slate-500" />
        <span className="text-sm font-semibold text-slate-700">告警消息模板</span>
        <span className="text-xs text-slate-400">（共 {ALERT_TYPE_DEFS.length} 种告警，点击展开编辑）</span>
      </div>
      <div className="p-4 space-y-2">
        {ALERT_TYPE_DEFS.map(def => (
          <AlertTypePanel
            key={def.id}
            def={def}
            allSettings={allSettings}
            isLoadingSettings={isLoading}
          />
        ))}
      </div>
    </div>
  );
}

// ── SEO 关键词配置卡片 ──────────────────────────────────────────────────────────
function SeoKeywordConfigCard() {
  const utils = trpc.useUtils();
  const [selectedSite, setSelectedSite] = useState<string>('A1');
  const [newKeyword, setNewKeyword] = useState('');
  const [showBatch, setShowBatch] = useState(false);
  const [batchText, setBatchText] = useState('');
  const [batchLoading, setBatchLoading] = useState(false);

  const { data: keywords = [], isLoading, refetch } = trpc.seo.listKeywords.useQuery(
    { siteType: selectedSite as any },
    { enabled: true }
  );

  const addMutation = trpc.seo.addKeyword.useMutation({
    onSuccess: () => {
      toast.success('关键词已添加');
      setNewKeyword('');
      utils.seo.listKeywords.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = trpc.seo.deleteKeyword.useMutation({
    onSuccess: () => {
      toast.success('关键词已删除');
      utils.seo.listKeywords.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleAdd = () => {
    const kw = newKeyword.trim();
    if (!kw) { toast.error('请输入关键词'); return; }
    addMutation.mutate({ siteType: selectedSite as any, keyword: kw });
  };

  const handleBatchAdd = async () => {
    const lines = batchText.split('\n').map(l => l.trim()).filter(l => l.length > 0 && l.length <= 128);
    const unique = Array.from(new Set(lines));
    if (unique.length === 0) { toast.error('请输入至少一个关键词'); return; }
    setBatchLoading(true);
    let added = 0;
    for (const kw of unique) {
      try {
        await addMutation.mutateAsync({ siteType: selectedSite as any, keyword: kw });
        added++;
      } catch {}
    }
    setBatchLoading(false);
    setBatchText('');
    setShowBatch(false);
    toast.success(`成功添加 ${added} 个关键词`);
    utils.seo.listKeywords.invalidate();
  };

  return (
    <div className="bg-white rounded border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-700">SEO 关键词监听配置</span>
          <span className="text-xs text-slate-400">（按站点配置触发关键词，留空时使用系统默认关键词）</span>
        </div>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      <div className="p-4 space-y-4">
        {/* 站点选择 */}
        <div className="flex items-center gap-3">
          <Label className="text-xs text-slate-600 whitespace-nowrap">选择站点：</Label>
          <div className="flex flex-wrap gap-1.5">
            {SITE_TYPES.map(s => (
              <button
                key={s}
                onClick={() => setSelectedSite(s)}
                className={`px-2.5 py-0.5 rounded text-xs font-medium border transition-colors ${
                  selectedSite === s
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400 hover:text-blue-600'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* 关键词列表 */}
        <div>
          <div className="text-xs text-slate-500 mb-2">
            {selectedSite} 站点关键词
            {(keywords as any[]).length === 0 && !isLoading && (
              <span className="ml-2 text-amber-500">（未配置，将使用系统默认关键词）</span>
            )}
          </div>
          {isLoading ? (
            <div className="text-xs text-slate-400 py-2">加载中...</div>
          ) : (
            <div className="flex flex-wrap gap-1.5 min-h-[32px]">
              {(keywords as any[]).map((kw: any) => (
                <span
                  key={kw.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-200"
                >
                  {kw.keyword}
                  <button
                    onClick={() => deleteMutation.mutate({ id: kw.id })}
                    disabled={deleteMutation.isPending}
                    className="text-blue-400 hover:text-red-500 transition-colors ml-0.5"
                  >
                    ×
                  </button>
                </span>
              ))}
              {(keywords as any[]).length === 0 && (
                <span className="text-xs text-slate-300 italic">暂无自定义关键词</span>
              )}
            </div>
          )}
        </div>

        {/* 新增关键词 */}
        <div className="flex gap-2">
          <Input
            className="h-8 text-sm flex-1"
            placeholder={`为 ${selectedSite} 添加关键词，例如：更新链接`}
            value={newKeyword}
            onChange={e => setNewKeyword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <Button
            size="sm"
            className="h-8 text-xs gap-1"
            onClick={handleAdd}
            disabled={addMutation.isPending || !newKeyword.trim()}
          >
            <Plus className="w-3 h-3" />
            添加
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1"
            onClick={() => { setShowBatch(true); setBatchText(''); }}
          >
            批量导入
          </Button>
        </div>

        {/* 批量导入展开区域 */}
        {showBatch && (
          <div className="border border-blue-100 rounded p-3 bg-blue-50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-blue-700">批量导入关键词（每行一个）</span>
              <button onClick={() => setShowBatch(false)} className="text-blue-400 hover:text-blue-600 text-xs">取消</button>
            </div>
            <Textarea
              className="text-sm min-h-[100px] resize-none bg-white"
              placeholder={`每行输入一个关键词，例如：\n链接\nSEO链接\n更新下链接`}
              value={batchText}
              onChange={e => setBatchText(e.target.value)}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-blue-500">
                {(() => {
                  const lines = batchText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                  const existingSet = new Set((keywords as any[]).map((k: any) => k.keyword.toLowerCase()));
                  const duplicates = lines.filter(l => existingSet.has(l.toLowerCase()));
                  const newCount = lines.length - duplicates.length;
                  return (
                    <>
                      将添加 <strong>{newCount}</strong> 个关键词
                      {duplicates.length > 0 && (
                        <span className="ml-1.5 text-amber-600">
                          （已存在 {duplicates.length} 个重复将跳过）
                        </span>
                      )}
                    </>
                  );
                })()}
              </span>
              <Button
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={handleBatchAdd}
                disabled={batchLoading || !batchText.trim()}
              >
                {batchLoading ? '导入中...' : '确认导入'}
              </Button>
            </div>
          </div>
        )}

        <p className="text-xs text-slate-400">
          提示：关键词匹配时忽略大小写和空格。若某站点未配置关键词，系统将使用默认关键词列表（链接、seo链接、更新下链接 等）。
        </p>
      </div>
    </div>
  );
}

// ── SE// ── SEO 通知文案配置卡片 ────────────────────────────────────────────────
const NOTIFY_TEMPLATE_TYPES = [
  { value: 'reply_keyword', label: '关键词回复文案', desc: '监听到关键词后立即回复的消息，默认为「请稍等」，支持 {{siteType}} 占位符' },
  { value: 'replace_done', label: '换域完成通知', desc: '域名替换完成后发送到群内的消息，支持 {{siteType}} 和 {{replacedCount}} 占位符' },
  { value: 'check_start', label: '检测完成无需替换', desc: '检测完成但所有域名正常无需替换时发送的消息，支持 {{siteType}} 占位符' },
] as const;

type NotifyTemplateType = 'replace_done' | 'check_start' | 'reply_keyword';

function SeoNotifyTemplateCard() {
  const utils = trpc.useUtils();
  const [selectedSite, setSelectedSite] = useState<string>('A1');
  const [editingType, setEditingType] = useState<NotifyTemplateType | null>(null);
  const [editContent, setEditContent] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; label: string } | null>(null);
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [copyTargetSites, setCopyTargetSites] = useState<string[]>([]);

  const { data: templates = [], isLoading, refetch } = trpc.seo.listNotifyTemplates.useQuery(
    { siteType: selectedSite as any },
    { enabled: true }
  );

  // 获取当前站点的 SEO 导航数据（用于预填真实域名）
  const { data: navData } = trpc.seo.getNavData.useQuery(
    { siteType: selectedSite },
    { enabled: true }
  );

  const upsertMutation = trpc.seo.upsertNotifyTemplate.useMutation({
    onSuccess: () => {
      toast.success('文案已保存');
      setEditingType(null);
      utils.seo.listNotifyTemplates.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleMutation = trpc.seo.toggleNotifyTemplate.useMutation({
    onSuccess: () => {
      utils.seo.listNotifyTemplates.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = trpc.seo.deleteNotifyTemplate.useMutation({
    onSuccess: () => {
      toast.success('文案已删除，将恢复使用默认模板');
      setDeleteTarget(null);
      utils.seo.listNotifyTemplates.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const testSendMutation = trpc.seo.testSendNotify.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    },
    onError: (err: any) => toast.error(err.message),
  });

  const getTemplate = (type: string) => (templates as any[]).find((t: any) => t.templateType === type);

  const batchCopyMutation = trpc.seo.batchCopyNotifyTemplate.useMutation({
    onSuccess: (data) => {
      toast.success(`文案已成功复制到 ${data.copiedCount} 个站点`);
      setShowCopyDialog(false);
      setCopyTargetSites([]);
      utils.seo.listNotifyTemplates.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  // 根据当前站点的 SEO 导航数据构建预填文本
  const buildReplaceDoneDefault = () => {
    const SEO_MAIN_CATS = ['web', 'h5', 'full', 'sports'];
    const SEO_FUJIAN_CATS = ['fujian_web', 'fujian_h5'];
    const catLabel: Record<string, string> = {
      web: 'WEB', h5: 'H5', full: '全站', sports: '体育',
      fujian_web: 'WEB', fujian_h5: 'H5',
    };
    const grouped = navData?.grouped?.[selectedSite] ?? {};
    const lines: string[] = ['{{siteType}}'];

    const mainRows = SEO_MAIN_CATS.filter(c => grouped[c]?.length > 0);
    if (mainRows.length > 0) {
      lines.push('SEO专用域名');
      lines.push('');
      for (const cat of mainRows) {
        const domain = grouped[cat]?.[0]?.domain ?? `域名(${catLabel[cat]})`;
        lines.push(`${catLabel[cat]}  ${domain}`);
      }
    }

    const fjRows = SEO_FUJIAN_CATS.filter(c => grouped[c]?.length > 0);
    if (fjRows.length > 0) {
      if (mainRows.length > 0) lines.push('');
      lines.push('SEO 福建敏感区域名');
      lines.push('');
      for (const cat of fjRows) {
        const domain = grouped[cat]?.[0]?.domain ?? `域名(${catLabel[cat]})`;
        lines.push(`${catLabel[cat]}  ${domain}`);
      }
    }

    // 如果导航数据为空，回退到占位符模板
    if (mainRows.length === 0 && fjRows.length === 0) {
      return `{{siteType}}
SEO专用域名

WEB  域名1
H5  域名2
全站  域名3
体育  域名4

SEO 福建敏感区域名

WEB  域名5
H5  域名6`;
    }

    return lines.join('\n');
  };

  // 各模板类型的系统默认文本（编辑框无已保存内容时预填）
  const getDefaultContent = (type: NotifyTemplateType): string => {
    if (type === 'replace_done') return buildReplaceDoneDefault();
    if (type === 'reply_keyword') return '您好，请稍等。';
    return `{{siteType}} 检测完成，所有域名均正常，无需替换。`;
  };

  const openEdit = (type: NotifyTemplateType) => {
    const existing = getTemplate(type);
    // 如果有已保存的内容则使用已保存内容，否则预填默认模板文本（replace_done 时使用真实域名）
    setEditContent(existing?.content ?? getDefaultContent(type));
    setEditingType(type);
  };

  return (
    <div className="bg-white rounded border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Send className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-700">SEO 通知文案配置</span>
          <span className="text-xs text-slate-400">（按站点自定义检测完成后发送到群内的消息文案）</span>
        </div>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      <div className="p-4 space-y-4">
        {/* 站点选择 */}
        <div className="flex items-center gap-3">
          <Label className="text-xs text-slate-600 whitespace-nowrap">选择站点：</Label>
          <div className="flex flex-wrap gap-1.5">
            {SITE_TYPES.map(s => (
              <button
                key={s}
                onClick={() => setSelectedSite(s)}
                className={`px-2.5 py-0.5 rounded text-xs font-medium border transition-colors ${
                  selectedSite === s
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400 hover:text-blue-600'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* 文案类型列表 */}
        {isLoading ? (
          <div className="text-xs text-slate-400 py-2">加载中...</div>
        ) : (
          <div className="space-y-3">
            {NOTIFY_TEMPLATE_TYPES.map(def => {
              const existing = getTemplate(def.value);
              return (
                <div key={def.value} className="border border-slate-100 rounded p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-slate-700">{def.label}</span>
                        {existing ? (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 border border-green-200">已自定义</span>
                        ) : (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">使用默认</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mb-2">{def.desc}</p>
                      {existing && (
                        <pre className="text-xs bg-slate-50 border border-slate-100 rounded p-2 whitespace-pre-wrap break-all text-slate-600 max-h-24 overflow-y-auto">
                          {existing.content}
                        </pre>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {/* 一键开关：仅已配置时可用，未配置时默认启用 */}
                      <button
                        onClick={() => {
                          if (!existing) { toast.error('请先配置文案再开关'); return; }
                          toggleMutation.mutate({
                            siteType: selectedSite as any,
                            templateType: def.value as NotifyTemplateType,
                            enabled: !existing.enabled,
                          });
                        }}
                        disabled={toggleMutation.isPending}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border transition-colors ${
                          !existing
                            ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-default'
                            : existing.enabled
                              ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200 cursor-pointer'
                              : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200 cursor-pointer'
                        }`}
                        title={!existing ? '未配置，默认启用' : existing.enabled ? '点击禁用' : '点击启用'}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${ !existing || existing.enabled ? 'bg-green-500' : 'bg-gray-400' }`} />
                        {!existing ? '默认开' : existing.enabled ? '开' : '关'}
                      </button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-xs"
                        onClick={() => openEdit(def.value as NotifyTemplateType)}
                      >
                        <Pencil className="w-3 h-3 mr-1" />
                        {existing ? '编辑' : '配置'}
                      </Button>
                      {existing && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setDeleteTarget({ id: existing.id, label: def.label })}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-xs text-slate-400">
          提示：未配置时使用系统内置默认模板。自定义文案支持 Markdown 格式，占位符 {'{{siteType}}'} 会替换为站点名称，{'{{replacedCount}}'} 会替换为替换域名数量。
        </p>
      </div>

      {/* 编辑文案弹窗 */}
      <Dialog open={!!editingType} onOpenChange={(open) => { if (!open) setEditingType(null); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              配置 {selectedSite} - {NOTIFY_TEMPLATE_TYPES.find(d => d.value === editingType)?.label}
            </DialogTitle>
            <DialogDescription>
              {NOTIFY_TEMPLATE_TYPES.find(d => d.value === editingType)?.desc}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            {/* 左侧：编辑区 */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-slate-600">编辑文案</div>
              <Textarea
                className="text-sm min-h-[200px] font-mono resize-none"
                placeholder="输入自定义文案，支持 Markdown 格式..."
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
              />
              <div className="text-xs text-slate-400 space-y-0.5">
                <div>可用占位符：</div>
                <div>• <code className="bg-slate-100 px-1 rounded">{'{{siteType}}'}</code> — 站点名称（如 A1）</div>
                <div>• <code className="bg-slate-100 px-1 rounded">{'{{replacedCount}}'}</code> — 替换域名数量</div>
              </div>
            </div>
            {/* 右侧：实时预览 */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-slate-600">实时预览（占位符已替换）</div>
              <div className="min-h-[200px] rounded border border-slate-200 bg-slate-900 p-3 overflow-y-auto">
                {editContent.trim() ? (
                  <pre className="text-xs text-slate-100 whitespace-pre-wrap break-all font-mono leading-relaxed">
                    {editContent
                      .replace(/\{\{siteType\}\}/g, selectedSite)
                      .replace(/\{\{replacedCount\}\}/g, '3')
                    }
                  </pre>
                ) : (
                  <div className="text-xs text-slate-500 italic">在左侧输入文案后，这里将实时显示占位符替换后的最终效果</div>
                )}
              </div>
              <div className="text-xs text-slate-400">
                预览中 <code className="bg-slate-100 px-1 rounded">{'{{replacedCount}}'}</code> 以示例值 <strong>3</strong> 显示
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditingType(null)}>取消</Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCopyTargetSites([]);
                setShowCopyDialog(true);
              }}
              disabled={!editContent.trim()}
              className="text-purple-600 border-purple-200 hover:bg-purple-50"
            >
              复制到其他站点
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => editingType && editContent.trim() && testSendMutation.mutate({
                siteType: selectedSite as any,
                templateType: editingType,
                content: editContent.trim(),
              })}
              disabled={testSendMutation.isPending || !editContent.trim()}
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              {testSendMutation.isPending ? '发送中...' : '测试发送'}
            </Button>
            <Button
              size="sm"
              onClick={() => editingType && upsertMutation.mutate({
                siteType: selectedSite as any,
                templateType: editingType,
                content: editContent.trim(),
              })}
              disabled={upsertMutation.isPending || !editContent.trim()}
            >
              {upsertMutation.isPending ? '保存中...' : '保存文案'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认弹窗 */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>确认删除文案</DialogTitle>
            <DialogDescription>
              确定要删除 {selectedSite} 站点的「{deleteTarget?.label}」自定义文案吗？删除后将恢复使用系统默认模板。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteTarget && deleteMutation.mutate({ id: deleteTarget.id })}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 复制到其他站点对话框 */}
      <Dialog open={showCopyDialog} onOpenChange={(open) => { if (!open) { setShowCopyDialog(false); setCopyTargetSites([]); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>复制文案到其他站点</DialogTitle>
            <DialogDescription>
              将 {selectedSite} 站点的「{editingType === 'replace_done' ? '换域完成通知' : editingType === 'check_start' ? '检测完成无需替换' : '关键词回复文案'}」复制到以下站点（将覆盖已有配置）：
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <div className="flex flex-wrap gap-2">
              {SITE_TYPES.filter(s => s !== selectedSite).map(s => (
                <button
                  key={s}
                  onClick={() => setCopyTargetSites(prev =>
                    prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
                  )}
                  className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
                    copyTargetSites.includes(s)
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-white text-slate-600 border-slate-300 hover:border-purple-400'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                className="text-xs text-purple-600 hover:underline"
                onClick={() => setCopyTargetSites(SITE_TYPES.filter(s => s !== selectedSite) as string[])}
              >
                全选
              </button>
              <button
                className="text-xs text-slate-400 hover:underline"
                onClick={() => setCopyTargetSites([])}
              >
                取消全选
              </button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setShowCopyDialog(false); setCopyTargetSites([]); }}>取消</Button>
            <Button
              size="sm"
              className="bg-purple-600 hover:bg-purple-700"
              disabled={copyTargetSites.length === 0 || batchCopyMutation.isPending}
              onClick={() => {
                if (!editingType || !editContent.trim()) return;
                batchCopyMutation.mutate({
                  fromSiteType: selectedSite as any,
                  templateType: editingType,
                  content: editContent.trim(),
                  toSiteTypes: copyTargetSites as any[],
                });
              }}
            >
              {batchCopyMutation.isPending ? '复制中...' : `复制到 ${copyTargetSites.length} 个站点`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
