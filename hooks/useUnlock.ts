/**
 * useUnlock hook
 * 管理"域名检测"功能的解锁状态
 * - 通过设备指纹（UA+屏幕+时区等哈希）+ IP 双重识别
 * - 首次访问时隐藏域名检测功能，完成一次端口生成后解锁
 * - 解锁状态同时保存在 localStorage（本地快速读取）和服务端数据库（防清除）
 */
import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/lib/trpc';

const LS_KEY = 'domain_checker_unlocked';
const FP_KEY = 'device_fingerprint';

/** 生成设备指纹（SHA-256 哈希） */
async function generateFingerprint(): Promise<string> {
  const cached = localStorage.getItem(FP_KEY);
  if (cached) return cached;

  const raw = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency ?? 0,
    navigator.platform ?? '',
  ].join('|');

  const encoder = new TextEncoder();
  const data = encoder.encode(raw);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const fp = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  localStorage.setItem(FP_KEY, fp);
  return fp;
}

export function useUnlock() {
  const [fingerprint, setFingerprint] = useState<string>('');
  // 优先读取 localStorage 快速判断，避免闪烁
  const [unlocked, setUnlocked] = useState<boolean>(() => {
    try {
      return localStorage.getItem(LS_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [checking, setChecking] = useState(!unlocked);

  // 服务端查询（仅在本地未解锁时才查询，节省请求）
  const checkQuery = trpc.unlock.check.useQuery(
    { fingerprint },
    {
      enabled: !!fingerprint && !unlocked,
      retry: false,
      staleTime: 1000 * 60 * 5, // 5 分钟内不重复查询
    }
  );

  const recordMutation = trpc.unlock.record.useMutation();

  // 初始化：生成指纹
  useEffect(() => {
    generateFingerprint().then(fp => {
      setFingerprint(fp);
    });
  }, []);

  // 服务端查询结果处理
  useEffect(() => {
    if (checkQuery.data?.unlocked) {
      localStorage.setItem(LS_KEY, '1');
      setUnlocked(true);
    }
    if (!checkQuery.isLoading && fingerprint) {
      setChecking(false);
    }
  }, [checkQuery.data, checkQuery.isLoading, fingerprint]);

  // 本地已解锁时直接停止 checking
  useEffect(() => {
    if (unlocked) setChecking(false);
  }, [unlocked]);

  /** 触发解锁（完成端口生成后调用） */
  const unlock = useCallback(async () => {
    if (unlocked) return;
    const fp = fingerprint || await generateFingerprint();
    localStorage.setItem(LS_KEY, '1');
    setUnlocked(true);
    // 异步通知服务端，不阻塞 UI
    recordMutation.mutate({ fingerprint: fp });
  }, [unlocked, fingerprint, recordMutation]);

  return { unlocked, checking, unlock };
}
