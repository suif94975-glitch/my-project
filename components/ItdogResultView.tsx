/**
 * ITDOG 检测结果展示组件
 * 样式与 AliyunResultView 完全一致：
 * - 顶部标题区（域名 + 平均速度徽章）
 * - 汇总卡片（节点数/成功/失败/平均响应）
 * - 最快/最慢节点行
 * - Tab 切换（全国地图 / 运营商统计 / IP 解析分布 / 详细结果）
 * - 中国省份 SVG 地图（按响应速度着色）
 * - 运营商统计表
 * - IP 解析统计
 * - 详细检测表格（支持排序+过滤）
 */

import { useState, useMemo } from 'react';
import { Activity, Globe, Zap, AlertCircle, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import ChinaMap from './ChinaMap';

// ─── 颜色分级（与 AliyunResultView 完全一致）────────────────────────────────────
const SPEED_LEVELS = [
  { label: '极快', max: 200,      color: '#22c55e', bg: 'bg-green-500',  text: 'text-green-700',  light: 'bg-green-50',  border: 'border-green-200' },
  { label: '快',   max: 500,      color: '#84cc16', bg: 'bg-lime-500',   text: 'text-lime-700',   light: 'bg-lime-50',   border: 'border-lime-200' },
  { label: '中等', max: 1000,     color: '#f59e0b', bg: 'bg-amber-500',  text: 'text-amber-700',  light: 'bg-amber-50',  border: 'border-amber-200' },
  { label: '慢',   max: 2000,     color: '#f97316', bg: 'bg-orange-500', text: 'text-orange-700', light: 'bg-orange-50', border: 'border-orange-200' },
  { label: '很慢', max: Infinity, color: '#ef4444', bg: 'bg-red-500',    text: 'text-red-700',    light: 'bg-red-50',    border: 'border-red-200' },
];

function getSpeedLevel(ms: number) {
  return SPEED_LEVELS.find(l => ms < l.max) ?? SPEED_LEVELS[SPEED_LEVELS.length - 1];
}

function getSpeedColor(ms: number): string {
  if (ms <= 0) return '#e5e7eb';
  return getSpeedLevel(ms).color;
}

// ─── 接口定义 ─────────────────────────────────────────────────────────────────
interface ItdogCheckRow {
  node: string;
  nodeZh: string;
  ip: string;
  ipLocation: string;  // IP 归属地（如「中国/广东/深圳/电信」）
  httpCode: number;
  totalTimeMs: number;
  dnsTimeMs: number;
  connectTimeMs: number;
  downloadTimeMs: number;
  redirectCount: number;
  redirectTimeMs: number;
  isp: string;
  region: string;
  status: 'success' | 'failed';
}

interface ItdogRegionStat {
  name: string;
  fastest: string;
  fastestMs: number;
  slowest: string;
  slowestMs: number;
  avgMs: number;
  count: number;
}

interface ItdogIpStat {
  ip: string;
  count: number;
  percent: number;
}

interface ItdogCheckResult {
  domain: string;
  checkedAt: number;
  rows: ItdogCheckRow[];
  regionStats: ItdogRegionStat[];
  ipStats: ItdogIpStat[];
  summary: {
    total: number;
    success: number;
    failed: number;
    avgTimeMs: number;
    minTimeMs: number;
    maxTimeMs: number;
    minNode: string;
    maxNode: string;
  };
}

interface ItdogResultViewProps {
  data: ItdogCheckResult;
}

type SortKey = 'nodeZh' | 'ip' | 'ipLocation' | 'httpCode' | 'totalTimeMs' | 'dnsTimeMs' | 'connectTimeMs' | 'downloadTimeMs';
type SortDir = 'asc' | 'desc';

// ─── 主组件 ───────────────────────────────────────────────────────────────────
export default function ItdogResultView({ data }: ItdogResultViewProps) {
  const { domain, checkedAt, rows, regionStats, ipStats, summary } = data;
  const [filterIsp, setFilterIsp] = useState<string>('全部');
  const [sortKey, setSortKey] = useState<SortKey>('totalTimeMs');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [activeTab, setActiveTab] = useState<'map' | 'isp' | 'ip' | 'detail'>('map');

  // 按省份聚合平均响应时间（供地图使用）
  const provinceData = useMemo(() => {
    const map: Record<string, { times: number[]; failed: number }> = {};
    rows.forEach(r => {
      if (!r.region) return;
      if (!map[r.region]) map[r.region] = { times: [], failed: 0 };
      if (r.status === 'success' && r.totalTimeMs > 0) {
        map[r.region].times.push(r.totalTimeMs);
      } else {
        map[r.region].failed++;
      }
    });
    const result: Record<string, { avgMs: number; count: number; failed: number }> = {};
    for (const [prov, { times, failed }] of Object.entries(map)) {
      if (times.length > 0) {
        result[prov] = {
          avgMs: Math.round(times.reduce((s, t) => s + t, 0) / times.length),
          count: times.length,
          failed,
        };
      }
    }
    return result;
  }, [rows]);

  // 过滤 + 排序
  const filteredRows = useMemo(() => {
    let list = filterIsp === '全部' ? rows : rows.filter(r => r.isp === filterIsp);
    list = [...list].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv), 'zh');
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [rows, filterIsp, sortKey, sortDir]);

  const ispList = useMemo(() => {
    const set = new Set(rows.map(r => r.isp).filter(Boolean));
    return ['全部', ...Array.from(set)];
  }, [rows]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ChevronsUpDown className="w-3 h-3 opacity-40" />;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  const avgLevel = getSpeedLevel(summary.avgTimeMs);

  return (
    <div className="w-full h-full overflow-y-auto bg-background">
      <div className="max-w-6xl mx-auto p-4 space-y-4">

        {/* ── 顶部汇总（与阿里云完全一致） ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-blue-100 flex items-center justify-center">
                <Globe className="w-4 h-4 text-blue-600" />
              </div>
              <h2 className="text-base font-bold text-foreground font-mono">{domain}</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 pl-9">
              检测时间：{new Date(checkedAt).toLocaleString('zh-CN')} · ITDOG 全国节点测速
            </p>
          </div>
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold ${avgLevel.light} ${avgLevel.border} ${avgLevel.text}`}>
            <Zap className="w-3.5 h-3.5" />
            平均 {summary.avgTimeMs} ms · {avgLevel.label}
          </div>
        </div>

        {/* ── 汇总卡片（与阿里云完全一致） ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: '检测节点', value: summary.total,   unit: '个', icon: <Activity className="w-4 h-4 text-blue-500" /> },
            { label: '成功节点', value: summary.success, unit: '个', icon: <Activity className="w-4 h-4 text-green-500" /> },
            { label: '失败节点', value: summary.failed,  unit: '个', icon: <AlertCircle className="w-4 h-4 text-red-500" /> },
            { label: '平均响应', value: summary.avgTimeMs, unit: 'ms', icon: <Zap className="w-4 h-4 text-amber-500" /> },
          ].map(card => (
            <div key={card.label} className="bg-card border border-border rounded p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">{card.label}</span>
                {card.icon}
              </div>
              <div className="text-xl font-bold text-foreground font-mono">
                {card.value.toLocaleString()}
                <span className="text-xs font-normal text-muted-foreground ml-1">{card.unit}</span>
              </div>
            </div>
          ))}
        </div>

        {/* ── 最快/最慢节点（与阿里云完全一致） ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-green-50 border border-green-200 rounded p-3">
            <div className="text-xs font-medium text-green-700 mb-1">最快节点</div>
            <div className="text-sm font-mono text-green-800 truncate">{summary.minNode || '—'}</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded p-3">
            <div className="text-xs font-medium text-red-700 mb-1">最慢节点</div>
            <div className="text-sm font-mono text-red-800 truncate">{summary.maxNode || '—'}</div>
          </div>
        </div>

        {/* ── Tab 切换（与阿里云完全一致：下划线样式） ── */}
        <div className="border-b border-border flex gap-0">
          {([
            { key: 'map',    label: '全国地图' },
            { key: 'isp',    label: '运营商统计' },
            { key: 'ip',     label: ipStats.length > 0 ? 'IP 解析分布' : '响应 IP' },
            { key: 'detail', label: `详细结果 (${rows.length})` },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── 全国地图 Tab ── */}
        {activeTab === 'map' && (
          <div className="bg-card border border-border rounded p-4">
            <h3 className="text-sm font-semibold text-foreground mb-4">全国响应速度热力图</h3>
            <ChinaMap provinceData={provinceData} />
          </div>
        )}

        {/* ── 运营商统计 Tab（与阿里云完全一致） ── */}
        {activeTab === 'isp' && (
          <div className="bg-card border border-border rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">运营商</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">节点数</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">平均响应</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground hidden md:table-cell">最快节点</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground hidden md:table-cell">最慢节点</th>
                </tr>
              </thead>
              <tbody>
                {regionStats.map((stat, i) => {
                  const level = getSpeedLevel(stat.avgMs);
                  return (
                    <tr key={stat.name} className={`border-b border-border/50 ${i % 2 === 0 ? '' : 'bg-muted/20'}`}>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${level.light} ${level.text}`}>
                          {stat.name}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs text-muted-foreground">{stat.count}</td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={`font-mono text-xs font-semibold ${level.text}`}>{stat.avgMs} ms</span>
                      </td>
                      <td className="px-4 py-2.5 hidden md:table-cell">
                        <span className="text-xs text-green-700 font-mono truncate block max-w-48">{stat.fastest}</span>
                      </td>
                      <td className="px-4 py-2.5 hidden md:table-cell">
                        <span className="text-xs text-red-700 font-mono truncate block max-w-48">{stat.slowest}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── IP 解析分布 / 响应 IP Tab ── */}
        {activeTab === 'ip' && (
          <IpTab ipStats={ipStats} rows={rows} />
        )}

        {/* ── 详细结果 Tab（与阿里云完全一致） ── */}
        {activeTab === 'detail' && (
          <div className="bg-card border border-border rounded overflow-hidden">
            {/* 过滤栏 */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/30 flex-wrap">
              <span className="text-xs text-muted-foreground">运营商：</span>
              {ispList.map(isp => (
                <button
                  key={isp}
                  onClick={() => setFilterIsp(isp)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    filterIsp === isp
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background border border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {isp}
                </button>
              ))}
              <span className="ml-auto text-xs text-muted-foreground">{filteredRows.length} 条</span>
            </div>

            {/* 表格 */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    {([
                      { key: 'nodeZh',        label: '检测节点' },
                      { key: 'ip',            label: '响应 IP' },
                      { key: 'ipLocation',    label: 'IP 归属地' },
                      { key: 'httpCode',      label: '状态码' },
                      { key: 'totalTimeMs',   label: '总耗时' },
                      { key: 'dnsTimeMs',     label: 'DNS' },
                      { key: 'connectTimeMs', label: '连接' },
                      { key: 'downloadTimeMs',label: '下载' },
                    ] as { key: SortKey; label: string }[]).map(col => (
                      <th
                        key={col.key}
                        className="text-left px-3 py-2.5 font-semibold text-muted-foreground cursor-pointer hover:text-foreground select-none whitespace-nowrap"
                        onClick={() => handleSort(col.key)}
                      >
                        <div className="flex items-center gap-1">
                          {col.label}
                          <SortIcon k={col.key} />
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, i) => {
                    const level = row.status === 'success' && row.totalTimeMs > 0 ? getSpeedLevel(row.totalTimeMs) : null;
                    const displayName = row.nodeZh || row.node;
                    return (
                      <tr key={i} className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                        <td className="px-3 py-2 font-medium text-foreground whitespace-nowrap">{displayName}</td>
                        <td className="px-3 py-2 font-mono text-muted-foreground whitespace-nowrap">{row.ip || '—'}</td>
                        <td className="px-3 py-2 text-muted-foreground whitespace-nowrap max-w-[160px] truncate" title={row.ipLocation || undefined}>
                          {row.ipLocation ? (
                            <span className="text-xs">{row.ipLocation}</span>
                          ) : '—'}
                        </td>
                        <td className="px-3 py-2">
                          {row.httpCode === -1 ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono font-semibold bg-red-100 text-red-700">
                              失败
                            </span>
                          ) : row.httpCode > 0 ? (
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono font-semibold ${
                              row.httpCode < 300 ? 'bg-green-100 text-green-700' :
                              row.httpCode < 400 ? 'bg-blue-100 text-blue-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {row.httpCode}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {level ? (
                            <span className={`font-mono font-semibold ${level.text}`}>{row.totalTimeMs.toFixed(1)}ms</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 font-mono text-muted-foreground whitespace-nowrap">
                          {row.dnsTimeMs > 0 ? `${row.dnsTimeMs.toFixed(1)}ms` : '—'}
                        </td>
                        <td className="px-3 py-2 font-mono text-muted-foreground whitespace-nowrap">
                          {row.connectTimeMs > 0 ? `${row.connectTimeMs.toFixed(1)}ms` : '—'}
                        </td>
                        <td className="px-3 py-2 font-mono text-muted-foreground whitespace-nowrap">
                          {row.downloadTimeMs > 0 ? `${row.downloadTimeMs.toFixed(1)}ms` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ─── IpTab 子组件：有 ipStats 时显示"IP 解析分布"，无时从 rows 提取"响应 IP" ─────
function IpTab({ ipStats, rows }: { ipStats: ItdogIpStat[]; rows: ItdogCheckRow[] }) {
  const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500', 'bg-pink-500'];

  if (ipStats.length > 0) {
    // 有 ipStats：显示 IP 解析分布（带进度条）
    return (
      <div className="bg-card border border-border rounded p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">IP 解析分布</h3>
        {ipStats.map((stat, i) => {
          const pct = typeof stat.percent === 'number' ? stat.percent : parseFloat(stat.percent as unknown as string);
          const color = colors[i % colors.length];
          return (
            <div key={stat.ip} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-semibold text-foreground">{stat.ip}</span>
                <span className="text-muted-foreground">{stat.count} 个节点 · {pct.toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // 无 ipStats：从 rows 提取响应 IP，去重统计
  const ipMap = new Map<string, { count: number; totalMs: number }>();
  rows.forEach(r => {
    if (r.ip && r.status === 'success') {
      const entry = ipMap.get(r.ip) || { count: 0, totalMs: 0 };
      entry.count++;
      entry.totalMs += r.totalTimeMs;
      ipMap.set(r.ip, entry);
    }
  });
  const ipList = Array.from(ipMap.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .map(([ip, v]) => ({ ip, count: v.count, avgMs: Math.round(v.totalMs / v.count) }));
  const maxCount = ipList[0]?.count ?? 1;

  return (
    <div className="bg-card border border-border rounded p-4 space-y-3">
      <h3 className="text-sm font-semibold text-foreground">响应 IP</h3>
      {ipList.length === 0 ? (
        <p className="text-xs text-muted-foreground">暂无响应 IP 数据</p>
      ) : (
        ipList.map((item, i) => {
          const color = colors[i % colors.length];
          return (
            <div key={item.ip} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-semibold text-foreground">{item.ip}</span>
                <span className="text-muted-foreground">{item.count} 个节点 · 均 {item.avgMs} ms</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.round((item.count / maxCount) * 100)}%` }} />
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
