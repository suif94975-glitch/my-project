/**
 * 复制 Hook
 * 每次均允许复制，无次数限制
 * 复制后记录到后端用于统计
 */
import { useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { getToken } from "@/lib/appAuth";
import { toast } from "sonner";

/** 从完整 URL 中提取纯域名和端口 */
function parseDomainAndPort(url: string): { domain: string; port: string } {
  try {
    const withProtocol = url.startsWith("http") ? url : `https://${url}`;
    const parsed = new URL(withProtocol);
    return {
      domain: parsed.hostname,
      port: parsed.port || "",
    };
  } catch {
    return { domain: url, port: "" };
  }
}

export function useCopyOnce() {
  const logCopyMutation = trpc.appAuth.logCopy.useMutation();

  /**
   * 复制域名（无次数限制，每次均可复制）
   * @param fullUrl 完整 URL（含协议+端口），用于写入剪贴板
   * @param displayText 实际写入剪贴板的文本（通常等于 fullUrl）
   */
  const copyDomain = useCallback(async (fullUrl: string, displayText?: string) => {
    const { domain, port } = parseDomainAndPort(fullUrl);
    const textToCopy = displayText ?? fullUrl;

    // 未登录时不允许复制
    if (!getToken()) {
      toast.error("请先登录");
      return false;
    }

    try {
      // 记录到后端（统计用，不做限制）
      await logCopyMutation.mutateAsync({ domain, port, fullUrl });

      // 写入剪贴板
      try {
        await navigator.clipboard.writeText(textToCopy);
      } catch {
        const textArea = document.createElement("textarea");
        textArea.value = textToCopy;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }

      toast.success("已复制");
      return true;
    } catch (err: any) {
      toast.error("复制失败：" + (err.message || "未知错误"));
      return false;
    }
  }, [logCopyMutation]);

  /**
   * 兼容旧接口：始终返回 false（不再标记已复制状态）
   */
  const isCopied = useCallback((_fullUrl: string) => {
    return false;
  }, []);

  return { copyDomain, isCopied, copiedKeys: new Set<string>() };
}
