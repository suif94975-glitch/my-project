/**
 * useSseManager - 页面级 SSE 连接管理器
 *
 * 核心设计：将所有 SSE 连接的生命周期从子组件提升到调用方（主组件），
 * 确保路由切换（Home.tsx 卸载/重建）时 SSE 连接不中断。
 *
 * 原理：
 * - SSE 连接实例存储在 module-level Map 中（完全脱离 React 生命周期）
 * - 流式数据状态存储在同一 Map 中
 * - 通过 React setState 触发重渲染
 * - 主组件卸载时不关闭连接，重建时直接复用已有连接和数据
 * - 只有在明确调用 closeConnection() 时才关闭连接
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export type ToolId = 'itdog' | 'aliyun' | 'zhale';
export type DomainQuality = 'good' | 'normal' | 'poor' | 'bad' | 'unknown';

export interface QueueInfo {
  isRunning: boolean;
  position: number;
  waitingCount: number;
  activeCount: number;
  maxConcurrent: number;
  estimatedWaitSec: number;
  submittedAt: number;
  startedAt: number;
}

export interface NodeProgress {
  received: number;
  expected: number;
  percent: number;
}

export interface SseState {
  streamRows: any[];
  resultData: any | null;
  loading: boolean;
  error: string | null;
  elapsed: number;
  queueInfo: QueueInfo | null;
  nodeProgress: NodeProgress | null;
  startedAt: number; // 开始检测的时间戳
}

interface SseEntry {
  state: SseState;
  es: EventSource | null;
  timer: ReturnType<typeof setInterval> | null;
  done: boolean; // 是否已完成（complete 或 error）
}

// Module-level storage - 完全脱离 React 生命周期
// key 格式: `${domain}:${toolId}:${resetKey}`
const sseStore = new Map<string, SseEntry>();

// 全局监听器集合，用于通知所有订阅者状态变化
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach(fn => fn());
}

function getSseKey(domain: string, toolId: ToolId, resetKey: number): string {
  return `${domain}:${toolId}:${resetKey}`;
}

function calcDomainQuality(data: any): DomainQuality {
  if (!data?.rows) return 'unknown';
  const rows = data.rows as any[];
  if (rows.length === 0) return 'unknown';
  // 与 Home.tsx calcDomainQuality 和 scheduler.ts gradeQuality 完全一致
  const isItdog = rows.length > 0 && 'httpCode' in rows[0];
  let failedNodes: number;
  let successRows: any[];
  if (isItdog) {
    // itdog: rows 已过滤未完成节点（httpCode=0）
    // 失败 = 连接失败（httpCode=-1）或 HTTP 错误状态码（httpCode >= 400）
    failedNodes = rows.filter((r: any) => r.httpCode === -1 || r.httpCode >= 400).length;
    successRows = rows.filter((r: any) => r.status === 'success' && r.totalTimeMs > 0);
  } else {
    // aliyun: rows 已过滤未完成节点，失败 = status 为 4xx/5xx
    failedNodes = rows.filter((r: any) => { const c = parseInt(r.status); return !isNaN(c) && c >= 400; }).length;
    successRows = rows.filter((r: any) => { const c = parseInt(r.status); return !isNaN(c) && c >= 200 && c < 400 && r.totalTimeMs > 0; });
  }
  const avgTimeMs = successRows.length > 0
    ? Math.round(successRows.reduce((s: number, r: any) => s + r.totalTimeMs, 0) / successRows.length)
    : 99999;
  // 优秀：失败节点 ≤ 4 且整体延迟 < 3000ms
  if (failedNodes <= 4 && avgTimeMs < 3000) return 'good';
  // 普通：失败节点 ≤ 6 且整体延迟 < 6000ms
  if (failedNodes <= 6 && avgTimeMs < 6000) return 'normal';
  // 差：失败节点 ≤ 8 且整体延迟 < 8000ms
  if (failedNodes <= 8 && avgTimeMs < 8000) return 'poor';
  // 其余均为极差
  return 'bad';
}

/**
 * 启动一个新的 SSE 连接（如果已存在且未完成则跳过）
 */
function startSse(
  domain: string,
  toolId: ToolId,
  resetKey: number,
  checkTarget: string,
  priority: number,
  startedAt: number,
  onDone: (quality: DomainQuality, result: any) => void,
  onError: (domain: string, toolId: ToolId) => void,
) {
  const key = getSseKey(domain, toolId, resetKey);

  // 已存在且未完成，跳过（防止重复启动）
  if (sseStore.has(key)) {
    const existing = sseStore.get(key)!;
    if (!existing.done) return;
    // 已完成的连接，直接返回（有缓存结果）
    return;
  }

  const entry: SseEntry = {
    state: {
      streamRows: [],
      resultData: null,
      loading: true,
      error: null,
      elapsed: Math.floor((Date.now() - startedAt) / 1000),
      queueInfo: null,
      nodeProgress: null,
      startedAt,
    },
    es: null,
    timer: null,
    done: false,
  };

  sseStore.set(key, entry);

  // 启动计时器
  entry.timer = setInterval(() => {
    const e = sseStore.get(key);
    if (!e || e.done) return;
    e.state = { ...e.state, elapsed: Math.floor((Date.now() - startedAt) / 1000) };
    notifyListeners();
  }, 1000);

  // 启动 SSE
  const apiPath = toolId === 'itdog' ? 'itdog-stream' : toolId === 'zhale' ? 'zhale-stream' : 'aliyun-stream';
  const url = `/api/proxy/${apiPath}?domain=${encodeURIComponent(checkTarget)}&priority=${priority}`;
  const es = new EventSource(url);
  entry.es = es;

  es.addEventListener('status', (e: MessageEvent) => {
    const ent = sseStore.get(key);
    if (!ent) return;
    try {
      const data = JSON.parse(e.data);
      ent.state = { ...ent.state, queueInfo: { ...(ent.state.queueInfo as any), position: data.position || 0 } };
      notifyListeners();
    } catch { /* ignore */ }
  });

  es.addEventListener('queue', (e: MessageEvent) => {
    const ent = sseStore.get(key);
    if (!ent) return;
    try {
      const data = JSON.parse(e.data);
      ent.state = { ...ent.state, queueInfo: data };
      notifyListeners();
    } catch { /* ignore */ }
  });

  es.addEventListener('row', (e: MessageEvent) => {
    const ent = sseStore.get(key);
    if (!ent) return;
    try {
      const row = JSON.parse(e.data);
      // 去重（以 node 为 key）
      if (ent.state.streamRows.some((r: any) => r.node === row.node)) return;
      ent.state = {
        ...ent.state,
        loading: false,
        streamRows: [...ent.state.streamRows, row],
      };
      notifyListeners();
    } catch { /* ignore */ }
  });

  es.addEventListener('progress', (e: MessageEvent) => {
    const ent = sseStore.get(key);
    if (!ent) return;
    try {
      const data = JSON.parse(e.data);
      ent.state = { ...ent.state, nodeProgress: { received: data.received, expected: data.expected, percent: data.percent } };
      notifyListeners();
    } catch { /* ignore */ }
  });

  es.addEventListener('complete', (e: MessageEvent) => {
    const ent = sseStore.get(key);
    if (!ent) return;
    try {
      const data = JSON.parse(e.data);
      ent.state = { ...ent.state, resultData: data, loading: false };
      ent.done = true;
      notifyListeners();
      onDone(calcDomainQuality(data), data);
    } catch { /* ignore */ }
    es.close();
    if (ent.timer) clearInterval(ent.timer);
  });

  es.addEventListener('error', (e: MessageEvent) => {
    const ent = sseStore.get(key);
    if (!ent) return;
    try {
      const data = JSON.parse((e as any).data || '{}');
      ent.state = { ...ent.state, error: '检测失败：' + (data.message || '未知错误'), loading: false };
    } catch {
      ent.state = { ...ent.state, error: '检测失败，请重试', loading: false };
    }
    ent.done = true;
    notifyListeners();
    es.close();
    if (ent.timer) clearInterval(ent.timer);
    onError(domain, toolId);
  });

  es.onerror = () => {
    const ent = sseStore.get(key);
    if (!ent) return;
    if (es.readyState === EventSource.CLOSED) {
      if (ent.timer) clearInterval(ent.timer);
      if (ent.state.loading) {
        ent.state = { ...ent.state, error: '检测失败，请重试（服务器连接中断）', loading: false };
        ent.done = true;
        notifyListeners();
        onError(domain, toolId);
      }
    }
  };
}

/**
 * 关闭并清除一个 SSE 连接
 */
function closeSse(domain: string, toolId: ToolId, resetKey: number) {
  const key = getSseKey(domain, toolId, resetKey);
  const entry = sseStore.get(key);
  if (entry) {
    entry.es?.close();
    if (entry.timer) clearInterval(entry.timer);
    sseStore.delete(key);
  }
}

/**
 * 获取某个连接的当前状态
 */
export function getSseState(domain: string, toolId: ToolId, resetKey: number): SseState | null {
  const key = getSseKey(domain, toolId, resetKey);
  return sseStore.get(key)?.state ?? null;
}

/**
 * 检查某个连接是否已完成（done = true）
 * 用于在 useEffect 中检测 SSE 已完成但 React 状态未同步的情况
 */
export function isSseDone(domain: string, toolId: ToolId, resetKey: number): boolean {
  const key = getSseKey(domain, toolId, resetKey);
  return sseStore.get(key)?.done ?? false;
}

/**
 * useSseManager hook
 *
 * 在主组件中调用，管理所有 SSE 连接。
 * 返回 getSseState 函数和触发重渲染的版本号。
 */
export function useSseManager() {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const listener = () => setVersion(v => v + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const startConnection = useCallback((
    domain: string,
    toolId: ToolId,
    resetKey: number,
    checkTarget: string,
    priority: number,
    startedAt: number,
    onDone: (quality: DomainQuality, result: any) => void,
    onError: (domain: string, toolId: ToolId) => void,
  ) => {
    startSse(domain, toolId, resetKey, checkTarget, priority, startedAt, onDone, onError);
  }, []);

  const closeConnection = useCallback((domain: string, toolId: ToolId, resetKey: number) => {
    closeSse(domain, toolId, resetKey);
  }, []);

  const getState = useCallback((domain: string, toolId: ToolId, resetKey: number): SseState | null => {
    return getSseState(domain, toolId, resetKey);
  }, [version]); // eslint-disable-line react-hooks/exhaustive-deps

  const checkDone = useCallback((domain: string, toolId: ToolId, resetKey: number): boolean => {
    return isSseDone(domain, toolId, resetKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { startConnection, closeConnection, getState, checkDone, version };
}
