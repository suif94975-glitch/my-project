/**
 * 共享顶部导航栏
 * 设计：简洁大气，清晰层次，人性化交互
 */
import { Globe, Zap, Clock, Shield, LogOut, Activity, Database, Map } from 'lucide-react';
import { useLocation } from 'wouter';
import { useAppAuth } from '@/hooks/useAppAuth';
import NotificationBell from '@/components/NotificationBell';

interface AppNavProps {
  activeTab: 'generator' | 'checker' | 'scheduled' | 'scheduler' | 'admin' | 'library' | 'seo-nav';
  rightExtra?: React.ReactNode;
}

const NAV_TABS = [
  { id: 'generator' as const, label: '端口生成', icon: Zap, path: '/', desc: '批量生成域名端口 URL' },
  { id: 'checker' as const, label: '域名检测', icon: Globe, path: '/checker', desc: '全国多节点实时检测' },
  { id: 'scheduled' as const, label: '定时检测', icon: Clock, path: '/scheduled', desc: '每小时自动批量检测', requireAuth: true },
  { id: 'scheduler' as const, label: '调度器', icon: Activity, path: '/scheduler', desc: '调度器实时状态监控', requireAuth: true },
  { id: 'library' as const, label: '域名库', icon: Database, path: '/library', desc: '管理所有已导入的域名', requireAuth: true },
  { id: 'seo-nav' as const, label: 'SEO导航', icon: Map, path: '/seo-nav', desc: 'SEO在用域名导航页', requireAuth: true },
];

export default function AppNav({ activeTab, rightExtra }: AppNavProps) {
  const [, navigate] = useLocation();
  const { user, isAdmin, logout } = useAppAuth();

  const visibleTabs = NAV_TABS.filter(t => !t.requireAuth || user);

  return (
    <header className="border-b border-border bg-card sticky top-0 z-20">
      <div className="container flex items-center h-14 gap-1">

        {/* Logo */}
        <div className="flex items-center gap-2 flex-shrink-0 mr-2">
          <div className="w-7 h-7 rounded border border-primary/30 bg-primary/10 flex items-center justify-center">
            <Globe className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="font-semibold text-foreground text-sm hidden sm:inline select-none">
            域名工具箱
          </span>
        </div>

        {/* 分隔线 */}
        <div className="w-px h-5 bg-border flex-shrink-0 mr-1 hidden sm:block" />

        {/* Tab 导航 */}
        <nav className="flex items-center gap-0.5 flex-1">
          {visibleTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => !isActive && navigate(tab.path)}
                title={tab.desc}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium
                  transition-colors select-none
                  ${isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }
                `}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* 右侧区域 */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {rightExtra}

          {user ? (
            <div className="flex items-center gap-1 pl-2 border-l border-border">
              {/* 通知铃铛 */}
              <NotificationBell />

              {/* 管理后台入口（仅管理员） */}
              {isAdmin && (
                <button
                  onClick={() => navigate('/admin')}
                  className={`
                    flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium
                    transition-colors
                    ${activeTab === 'admin'
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }
                  `}
                  title="管理后台"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">管理</span>
                </button>
              )}

              {/* 用户名 + 退出 */}
              <div className="flex items-center gap-0.5 pl-0.5">
                <span className="text-xs text-muted-foreground hidden lg:inline select-none max-w-24 truncate px-1">
                  {user.username}
                </span>
                <button
                  onClick={() => { logout(); navigate('/login'); }}
                  className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title="退出登录"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              登录
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
