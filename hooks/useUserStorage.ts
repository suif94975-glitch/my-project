/**
 * useUserStorage — 基于当前登录用户 ID 的 localStorage 持久化 hook
 *
 * 特性：
 * - 以 `user:{userId}:{key}` 为存储 key，不同账号数据完全隔离
 * - 未登录时以 `user:anonymous:{key}` 存储，登录后自动迁移
 * - 接口与 useState 完全一致：[value, setValue]
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';

function buildKey(userId: string | undefined, key: string): string {
  const uid = userId ?? 'anonymous';
  return `user:${uid}:${key}`;
}

function readStorage<T>(storageKey: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw === null) return defaultValue;
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

function writeStorage<T>(storageKey: string, value: T): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(value));
  } catch {}
}

/**
 * 持久化 state hook，按当前登录用户隔离数据。
 *
 * @param key         存储键名（不含用户前缀）
 * @param defaultValue 默认值（用户无历史数据时使用）
 */
export function useUserStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const { user } = useAuth();
  const userId = user?.id !== undefined ? String(user.id) : undefined;

  // 当前存储 key（含用户前缀）
  const storageKey = buildKey(userId, key);
  const storageKeyRef = useRef(storageKey);

  // 初始化：从 localStorage 读取当前用户的数据
  const [value, setValueRaw] = useState<T>(() => readStorage(storageKey, defaultValue));

  // 当用户切换时，重新从 localStorage 加载对应用户的数据
  useEffect(() => {
    const newKey = buildKey(userId, key);
    if (newKey !== storageKeyRef.current) {
      storageKeyRef.current = newKey;
      setValueRaw(readStorage(newKey, defaultValue));
    }
  }, [userId, key, defaultValue]);

  // 写入时同时更新 state 和 localStorage
  const setValue = useCallback(
    (update: T | ((prev: T) => T)) => {
      setValueRaw(prev => {
        const next = typeof update === 'function' ? (update as (p: T) => T)(prev) : update;
        writeStorage(storageKeyRef.current, next);
        return next;
      });
    },
    []
  );

  // 每次 value 变化时同步写入（兜底，防止 storageKey 变化时漏写）
  useEffect(() => {
    writeStorage(storageKeyRef.current, value);
  }, [value]);

  return [value, setValue];
}
