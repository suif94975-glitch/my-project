#!/usr/bin/env python3
with open('/home/ubuntu/domain-checker/client/src/pages/AdminPanel.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

comment_marker = '// ── 告警消息模板编辑卡片'
comment_start = content.rfind(comment_marker)

func_marker = 'function AlertTemplateCard() {'
func_start = content.rfind(func_marker)

brace_count = 0
end_idx = func_start
in_func = False
for i in range(func_start, len(content)):
    if content[i] == '{':
        brace_count += 1
        in_func = True
    elif content[i] == '}':
        brace_count -= 1
        if in_func and brace_count == 0:
            end_idx = i + 1
            break

new_block = r"""// ── 告警消息模板编辑卡片（含实时预览 + 修改历史） ────────────────────────────────
const DEFAULT_TEMPLATE = `⚠️ *域名库库存预警*

🏢 厂商：{{vendor}}
📦 以下类别剩余数量小于 {{threshold}} 条：
{{items}}
⏰ 告警时间：{{time}}

📌 请尽快补充对应厂商的域名库，避免生成时无域名可用。`;

const TEMPLATE_VARS = [
  { key: "{{vendor}}", desc: "厂商名称" },
  { key: "{{threshold}}", desc: "当前低库存阈值（条）" },
  { key: "{{items}}", desc: "低库存类别列表（每行一条）" },
  { key: "{{time}}", desc: "告警触发时间（北京时间）" },
];

const MOCK_VARS: Record<string, string> = {
  vendor: "示例厂商",
  threshold: "3",
  items: "  • 落地页域名：剩余 *2* 条\n  • 跳转域名：剩余 *1* 条",
  time: new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }),
};

function renderPreview(template: string): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => MOCK_VARS[key] ?? `{{${key}}}`);
}

function AlertTemplateCard() {
  const utils = trpc.useUtils();
  const { data: allSettings, isLoading } = trpc.settings.getAll.useQuery();
  const { data: historyData, refetch: refetchHistory } = trpc.settings.getHistory.useQuery(
    { key: "low_stock_alert_template" },
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

  const currentTemplate = allSettings?.["low_stock_alert_template"] ?? DEFAULT_TEMPLATE;
  const [editing, setEditing] = React.useState(false);
  const [draftVal, setDraftVal] = React.useState("");
  const [showPreview, setShowPreview] = React.useState(false);
  const [showHistory, setShowHistory] = React.useState(false);
  const [diffTarget, setDiffTarget] = React.useState<{ id: number; value: string } | null>(null);
  const isDefault = currentTemplate === DEFAULT_TEMPLATE;

  const handleEdit = () => {
    setDraftVal(currentTemplate);
    setEditing(true);
    setShowPreview(false);
    setShowHistory(false);
  };

  const handleSave = () => {
    if (!draftVal.trim()) { toast.error("模板内容不能为空"); return; }
    setMut.mutate({ key: "low_stock_alert_template", value: draftVal });
  };

  const handleReset = () => {
    resetMut.mutate({ key: "low_stock_alert_template" });
  };

  const handleShowHistory = () => {
    setShowHistory(true);
    setEditing(false);
    setShowPreview(false);
    refetchHistory();
  };

  const historyRecords = historyData?.records ?? [];

  return (
    <div className="bg-white rounded border border-slate-200 overflow-hidden">
      {/* 卡片头部 */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-700">告警消息模板</span>
          {isDefault && (
            <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">默认</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!editing && !isDefault && (
            <Button size="sm" variant="outline" onClick={handleReset} disabled={resetMut.isPending}
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

      <div className="px-4 py-4 space-y-3">
        {/* 可用变量标签 */}
        <div className="flex flex-wrap gap-2">
          {TEMPLATE_VARS.map(v => (
            <span key={v.key}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-100 rounded text-xs text-blue-700 font-mono cursor-default"
              title={v.desc}>
              {v.key}
              <span className="font-sans text-blue-500 font-normal">= {v.desc}</span>
            </span>
          ))}
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
              {/* 编辑区 */}
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
              {/* 预览区 */}
              {showPreview && (
                <div className="space-y-1">
                  <p className="text-xs text-slate-400 font-medium">预览效果（模拟数据）</p>
                  <div className="bg-slate-800 rounded p-3 min-h-[10rem] max-h-64 overflow-y-auto">
                    <pre className="text-xs text-slate-100 whitespace-pre-wrap font-mono leading-relaxed">
                      {renderPreview(draftVal) || <span className="text-slate-500">（模板为空）</span>}
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
            {isLoading ? "加载中…" : currentTemplate}
          </pre>
        )}
      </div>
    </div>
  );
}
"""

new_content = content[:comment_start] + new_block + content[end_idx:]
with open('/home/ubuntu/domain-checker/client/src/pages/AdminPanel.tsx', 'w', encoding='utf-8') as f:
    f.write(new_content)
print("Done. New file length:", len(new_content))
