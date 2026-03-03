/**
 * 全局无操作自动登出 Hook
 *
 * 策略：
 * - 监听鼠标移动、键盘输入、点击、滚动等用户活动事件
 * - 1 小时（3600000ms）内无任何操作则自动登出
 * - 登出前 5 分钟弹出倒计时警告（可选）
 * - 仅在用户已登录时启用
 */
import { useEffect, useRef, useCallback } from "react";
import { clearToken } from "@/lib/appAuth";

const IDLE_TIMEOUT_MS = 60 * 60 * 1000; // 1 小时
const WARN_BEFORE_MS = 5 * 60 * 1000;   // 提前 5 分钟警告

interface UseIdleLogoutOptions {
  isLoggedIn: boolean;
  onLogout: () => void;
  onWarn?: (remainingMs: number) => void;
}

export function useIdleLogout({ isLoggedIn, onLogout, onWarn }: UseIdleLogoutOptions) {
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const clearTimers = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
  }, []);

  const doLogout = useCallback(() => {
    clearTimers();
    clearToken();
    onLogout();
  }, [clearTimers, onLogout]);

  const resetTimer = useCallback(() => {
    if (!isLoggedIn) return;
    lastActivityRef.current = Date.now();
    clearTimers();

    // 设置警告定时器（提前 5 分钟）
    if (onWarn) {
      warnTimerRef.current = setTimeout(() => {
        onWarn(WARN_BEFORE_MS);
      }, IDLE_TIMEOUT_MS - WARN_BEFORE_MS);
    }

    // 设置登出定时器
    idleTimerRef.current = setTimeout(() => {
      doLogout();
    }, IDLE_TIMEOUT_MS);
  }, [isLoggedIn, clearTimers, doLogout, onWarn]);

  useEffect(() => {
    if (!isLoggedIn) {
      clearTimers();
      return;
    }

    // 监听用户活动事件
    const events = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
      "click",
      "wheel",
    ];

    const handleActivity = () => resetTimer();

    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // 初始启动定时器
    resetTimer();

    return () => {
      clearTimers();
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [isLoggedIn, resetTimer, clearTimers]);
}
