/**
 * 全局禁止复制 Hook
 * 拦截 document 上的 copy 事件，阻止非 .allow-copy 区域的复制
 * 配合 CSS user-select: none 双重保护
 */
import { useEffect } from "react";

export function useGlobalCopyBlock() {
  useEffect(() => {
    const handleCopy = (e: ClipboardEvent) => {
      // 检查事件源是否在 .allow-copy 区域内
      const target = e.target as HTMLElement | null;
      if (!target) {
        e.preventDefault();
        e.clipboardData?.clearData();
        return;
      }
      // 如果目标元素或其祖先有 allow-copy 类，允许复制
      if (target.closest(".allow-copy")) {
        return; // 允许
      }
      // 否则阻止复制
      e.preventDefault();
      e.clipboardData?.clearData();
    };

    document.addEventListener("copy", handleCopy, true); // 捕获阶段
    return () => {
      document.removeEventListener("copy", handleCopy, true);
    };
  }, []);
}
