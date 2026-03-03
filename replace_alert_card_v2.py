"""
将 AdminPanel.tsx 中从第 2150 行（// ── 告警消息模板编辑卡片...）到末尾
替换为新的多类型告警模板管理组件。
"""

NEW_CONTENT = r'''
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

  const currentTemplate = allSettings?.[def.templateKey] ?? def.defaultTemplate;
  const isDisabled = allSettings?.[def.disabledKey] === "true";
  const isDefault = currentTemplate === def.defaultTemplate;

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
        </div>
      )}
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
'''

with open('/home/ubuntu/domain-checker/client/src/pages/AdminPanel.tsx', 'r') as f:
    content = f.read()

# Find the start marker
marker = '// ── 告警消息模板编辑卡片（含实时预览 + 修改历史） ────────────────────────────────'
idx = content.find(marker)
if idx == -1:
    print("ERROR: marker not found")
    exit(1)

# Replace from marker to end of file
new_content = content[:idx] + NEW_CONTENT.lstrip('\n')

with open('/home/ubuntu/domain-checker/client/src/pages/AdminPanel.tsx', 'w') as f:
    f.write(new_content)

print(f"Done. Original length: {len(content)}, New length: {len(new_content)}")
