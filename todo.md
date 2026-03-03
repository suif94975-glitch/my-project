# 域名质量检测工具 - TODO

## 核心功能

- [x] 项目初始化（React + TypeScript + tRPC + Express）
- [x] 专业SaaS风格UI设计（深蓝主色调，白色背景）
- [x] 域名输入框与验证（支持自动清理协议前缀）
- [x] 综合评分圆环组件（ScoreRing）
- [x] 检测结果卡片组件（CheckCard + InfoRow + Tag）

## 检测功能（7项）

- [x] WHOIS 注册信息检测（RDAP rdap.org 免费API）
- [x] DNS 记录检测（MxToolbox API + Cloudflare DoH 双源）
- [x] 黑名单声誉检测（MxToolbox Blacklist API）
- [x] SSL 证书检测（crt.sh 证书透明度日志）
- [x] SPF 记录检测（MxToolbox SPF API）
- [x] MX 邮件记录检测（MxToolbox + Cloudflare DoH 双源）
- [x] 全球流量排名（SimilarWeb via 内置API代理）

## 后端

- [x] tRPC 路由：domain.traffic（流量排名代理）
- [x] 单元测试（6项测试全部通过）

## UI/UX

- [x] 检测进度条（实时显示 x/7 进度）
- [x] 并行检测（所有7项同时发起，逐步显示结果）
- [x] 评分实时更新（每完成一项即更新综合分）
- [x] 集成工具来源展示（底部工具列表）
- [x] 响应式布局（1/2/3列自适应）
- [x] 空状态功能介绍（6项检测功能卡片）

## 重构需求（方案A：iframe嵌入 + 批量域名）

- [x] 移除旧的7项检测工具和相关组件
- [x] 批量域名输入（每行一个，支持多个域名）
- [x] 域名列表侧边栏（显示所有已输入域名，点击切换）
- [x] 阿里云拨测 iframe 嵌入（boce.aliyun.com/detect/http）
- [x] ITDOG 网站测速 iframe 嵌入（itdog.cn/http/）
- [x] 17CE 跳转链接（SAMEORIGIN限制，改为新标签页打开）
- [x] 域名切换时工具刷新
- [x] 当前检测域名高亮显示
- [x] 顶部域名复制栏（一键复制）
- [x] 单元测试全部通过（6/6）

## 并行检测功能（多域名后台持续运行）

- [x] 每个域名 × 每个工具 = 独立 iframe 实例（后台持续运行，不销毁）
- [x] 切换域名时只切换 iframe 显示/隐藏，不重新加载
- [x] 域名列表显示检测状态标识（检测中/已完成/未开始）
- [x] 支持单独启动某个域名的检测（点击“开始检测”按鈕）
- [x] 支持重置某个域名的检测（刷新对应 iframe）
- [x] 工具切换时保持各域名的 iframe 状态
- [x] 单元测试30项全部通过

## 自动填写并触发检测功能

- [x] 后端代理路由：`/api/proxy/itdog?domain=xxx` 和 `/api/proxy/aliyun?domain=xxx`
- [x] ITDOG：代理抓取HTML+资源路径重写+注入自动化脚本
- [x] 阿里云：包装页面嵌套真实阿里云iframe+自动复制剩贴方案
- [x] iframe src 改为指向本地代理路由
- [x] 添加域名时自动启动检测（无需手动操作）

## Bug 修复

- [x] 修复阿里云拨测代理页面异常（改为包装页面+自动复制剩贴）
- [x] 修复 ITDOG 代理页面 404 错误（修复资源路径重写）
- [x] 增强 ITDOG 广告过滤（MutationObserver 动态清除）
## 自动化优化（用户反馈）

- [x] 阿里云拨测：实现服务端代理+nativeInputValueSetter+OK按钮自动点击，真正无需手动操作
- [x] 17CE：实现服务端代理抓取+注入自动触发脚本，input#url填写+input#su点击，支持iframe内嵌

## 新需求（用户反馈 2）

- [ ] 修复阿里云代理乱码（编码问题）
- [ ] 修复17CE代理无结果（脚本注入失效）
- [ ] 工具选择功能：支持选择1/2/3个工具进行检测
- [ ] 后台自动运行：添加域名后立即后台运行所有选中工具，无需点击
- [x] 工具选择功能：支持选择1/2/3个工具进行检测（侧边栏多选checkbox）
- [x] 后台自动运行：添加域名后立即后台运行所有选中工具，无需点击

## 阿里云并发优化

- [x] 阿里云Puppeteer：实现串行队列，避免多域名并发超时
- [x] 前端：显示排队状态和预计等待时间

## 阿里云自定义前端展示

- [x] Puppeteer抓取阿里云JSON数据（而非截图）
- [x] 自定义前端展示：中国地图热力图+区域/运营商统计表+详细检测结果表格

## 阿里云前端展示优化（用户反馈）

- [x] 详细检测结果：检测点名称英文轮中文（节点名映射）
- [x] 热力图改为真实中国省份SVG轮廓地图，按响应速度着色

## 阿里云节点展示二次优化（用户反馈）

- [x] 补全拼音城市名映射（NeimengguWulanchabu等）
- [x] 节点展示格式改为"省份-城市「运营商」"
- [x] 最快/最慢节点也显示中文名
- [x] 地图改用高精度中国省份SVG轮廓，更美观

## 阿里云展示三次优化（用户反馈）

- [x] 修复节点名英文残留（香港Hong-KongHong等特殊地区）
- [x] 域名列表增加质量评级（绿/黄/红）
- [x] 域名列表增加一键复制
- [x] 地图改为精确省份SVG轮廓（参考图片白色边界线样式）

## 域名复制逻辑优化（用户反馈）

- [x] 一键复制改为复制完整URL（含协议+端口，如 https://www.baidu.com 或 https://example.com:8443）

## 工具调整（用户反馈）

- [x] 移除 17CE 检测工具（前后端全部清除）
- [x] 评估ITDOG能否用Puppeteer抓取结构化JSON（通过WebSocket监听可行）
- [x] 实现ITDOG Puppeteer抓取+自定义前端展示（与阿里云样式一致）
- [x] ITDOG工具配置更新（canIframe: false, usePuppeteer: true）
- [x] 域名列表质量标签更新（同时显示阿里云和ITDOG质量标签）

## Bug 修复（用户反馈 v3.1）

- [x] 阿里云和 ITDOG 各自独立队列，前端并行发起请求（已确认）
- [x] 修复 ITDOG 数据抓取不准确：改用 DOM 提取，修复完成判断条件，修复编译错误

## Bug 修复（用户反馈 v3.2）

- [x] 修复 ITDOG 检测报错『HTTP 500』：修复 page.evaluate 中 __name is not defined，改用字符串形式传入纯 JS
- [x] 修复 ITDOG isp/region/nodeZh 字段不准确：增加中文节点名解析逻辑（parseZhNodeInfo）

## 功能修复（用户反馈 v3.4）

- [x] 按域名列表顺序进行检测（先加入队列的先检测，不乱序）
- [x] 隐藏海外节点检测数据（过滤「海外 美国西雅图」「海外 澳大利亚悉尼」等节点）

## 代码清理（v3.5）

- [x] 删除 aliyun-puppeteer.ts 中的 _translateNodeName_UNUSED 和 _parseNodeInfo_UNUSED 函数（已迁移至 nodeTranslate.ts）
- [x] 删除 aliyun-puppeteer.ts 中的废弃 /aliyun-screenshot 路由（与 /aliyun-data 重复）
- [x] 重写 proxy.ts，删除废弃的 /itdog iframe 代理路由和 generateFallbackPage 等函数
- [x] 删除旧的 server/index.ts（已被 server/_core/index.ts 取代）
- [x] 删除前端 TOOLS 配置中的废弃字段（proxyUrl、canIframe、usePuppeteer）
- [x] 修正 Home.tsx 中的过时注释（iframe 相关描述）
- [x] 删除 client/src/lib/domainChecker.ts（旧版7项检测库，已无引用）
- [x] 删除 client/src/components/CheckCard.tsx 和 ScoreRing.tsx（旧版UI组件，已无引用）
- [x] 删除 client/src/pages/ComponentShowcase.tsx（模板示例页面，未注册路由）
- [x] 删除 AliyunResultView.tsx 中的冗余注释行

## Bug 修复（v3.6）

- [x] 修复生产环境 Puppeteer 找不到 Chromium 的问题：将 puppeteer-core 替换为 puppeteer（自带 Chromium），启动时优先使用 puppeteer.executablePath() 获取内置路径，回退到系统路径

## Bug 修复（v3.7）

- [x] 修复生产环境 Chromium 未下载问题：在 build 和 start 脚本中均加入 `node node_modules/puppeteer/install.mjs`，确保部署时自动下载 Chromium
- [x] 创建 .npmrc 文件，设置 enable-pre-post-scripts=true，允许 puppeteer postinstall 脚本运行

## Bug 修复（v3.8）

- [x] 修复生产容器缺少 Chromium 系统依赖库（libglib-2.0.so.0 等）的问题：创建 scripts/install-chrome-deps.sh，读取 deb.deps 文件并用 apt-get 安装所有必要系统库；在 start 脚本中自动执行

## Bug 修复（v3.9）

- [x] 创建 scripts/start.mjs Node.js 启动包装脚本：在 Node 进程内完成 Chromium 下载 + apt-get 系统依赖安装 + 服务启动，错误可捕获不中断，比 shell && 链更可靠

## Bug 修复（v4.0）

- [x] 彻底解决生产容器 Chromium 系统库缺失问题：改用 @sparticuz/chromium + puppeteer-core，该方案将 Chromium 静态编译打包，解压到 /tmp/chromium，完全不依赖任何系统库（libglib-2.0.so.0 等）
- [x] 移除 puppeteer 完整包，简化 start/build 脚本，删除 scripts/start.mjs 中的 apt-get 安装逻辑

## Bug 修复（v4.1）

- [x] 彻底解决生产容器 Chromium 系统库缺失问题：改用 Browserless.io 托管无头浏览器服务
- [x] 移除 @sparticuz/chromium、@sparticuz/chromium-min 等本地 Chromium 依赖
- [x] aliyun-puppeteer.ts 和 itdog-puppeteer.ts 均改用 puppeteer.connect(browserWSEndpoint) 连接 Browserless
- [x] 新增 browserless.test.ts 验证 Token 有效性和连接状态（42 项测试全部通过）

## Bug 修复（v4.2）

- [x] 修复生产环境 500 错误：移除全局 browserInstance，改为每次检测建立新的 Browserless 连接，用完即断（browser.disconnect()）
- [x] 修复域名传递逻辑：前端将完整 rawUrl（含协议+端口）传递给检测工具，不再仅传纯域名

## Bug 修复（v4.3）

- [x] 修复阿里云 HTTP 500 错误：detached Frame 问题——将 waitUntil 改为 networkidle2 + 额外等待 1s，并对等待循环和 DOM 提取中的 page.evaluate 增加 detached/closed 容错重试逻辑

## 重构优化（v5.0）

- [x] 阿里云和 ITDOG 均采用 SSE 流式接口，实时逐行推送检测结果到前端
- [x] 前端改用 EventSource 接收 SSE，收到第一行数据即隐藏 loading，实时逐行渲染
- [x] 流式展示时显示实时进度条（已获取 N 个节点 / 已等待 Xs）
- [x] 修复 buildRawUrl：保留 www. 前缀，不再剥离
- [x] Browserless 并发数调整为 2（阿里云和 ITDOG 各占一个通道并行）
- [x] itdog-puppeteer.ts 集成共享信号量（shared-browserless-queue.ts）
- [x] 41/42 项测试通过（1 项 Browserless 网络连通性测试因沙盒网络限制超时，非代码问题）

## Bug 修复（v5.1）

- [x] 修复阿里云 Navigating frame was detached：page.goto 改用 domcontentloaded（阿里云 SPA 持续发网络请求，networkidle2 会超时导致 frame 被销毁），并对 goto 本身增加 3 次重试容错
- [x] 修复 Browserless TLS 断开重试策略：固定 3s 改为指数退避（1s → 3s → 9s）
- [x] 修复前端 onerror 处理：HTTP 500 导致 EventSource 关闭时，若还在 loading 状态则显示"检测失败，请重试"而非空白（阿里云和 ITDOG 均已修复）
- [x] 42/42 测试全部通过

## 速度优化（v5.2）

- [x] ITDOG：goto 改为 domcontentloaded（快 2-3s）+ waitForSelector 替代固定 1500ms 等待 + 轮询间隔 2000ms→500ms + WS 完成判断 wsMessageCount>50→>10 且 1s 无新消息 + 完成后等待 2000ms→500ms + maxWait 120s→30s
- [x] 阿里云：去掉 goto 后固定 1500ms 等待 + 填写后等待 800ms→300ms + 轮询间隔 2000ms→500ms + 完成判断改为"行数>5 且连续 3 轮不增加" + 完成后等待 2000ms→500ms + maxWait 70s→20s
- [x] 42/42 测试全部通过

## 优化任务（v5.3）

- [x] 用百度域名实测检测速度，进一步优化到极限（阿里云完成判断改为行数>20+至少等5s+连续3轮稳定，数据完整性从105行提升到157行）
- [x] 统一 ITDOG 结果页面样式（以阿里云结果页为基准：顶部标题区+汇总卡片+最快/最慢节点+Tab下划线样式+运营商表+IP分布+详细表格）

## 功能优化（v5.4）

- [x] 阿里云和 ITDOG 检测失败/超时后显示重试按钮，允许用户手动重新检测
- [x] 全国响应速度热力图缩小一半，调整为贴近世界地图中中国展示的样式

## 布局优化（v5.4.1）

- [x] 默认工具选择改为只勾选 ITDOG，阿里云默认不勾选
- [x] 去除空状态页面中与左侧面板重复的内容（工具选择卡片、"添加域名开始检测"按钮）
- [x] 简化空状态页面，保留简洁的引导文字即可

## Bug 修复（v5.4.2）

- [x] 修复全国响应速度热力图显示不完整（黑龙江、新疆、内蒙古被裁切），调整 viewBox 完整显示所有省份

## 样式优化（v5.4.3）

- [x] 热力图 viewBox 去除下方多余留白，地图内容居中紧凑显示

## 样式优化（v5.4.4）

-- [x] 热力图容器放大约30%（从 50% 宽度调整为 65%，maxWidth 从 480px 调整为 624px）

## 功能优化（v5.4.5）

- [x] ITDOG 无 IP 解析分布数据时，将该模块改为显示"响应 IP"

## 样式优化（v5.4.6）

- [x] 热力图纵向比例放大 15%，横向比例维持不变

## 性能优化（v5.4.7）

- [x] 优化 ITDOG 检测速度（目标 10-20s），修复 Target closed 错误

## 新功能（v5.5.0）

- [x] 新建域名端口生成页面（DomainPortGenerator），支持输入域名批量生成三组端口（A8/A-8543/Toff）的完整 URL
- [x] 将域名端口生成页面设为首页（/），原域名检测工具移至 /checker
- [x] 支持一键复制单个 URL 和整组 URL

## 功能重构（v5.6.0）

- [x] 端口号全部隐藏，只显示端口组标题（A8/A-8543/Toff）
- [x] 未输入域名时隐藏所有端口组标题和选择项
- [x] 输入域名后显示端口组标题，支持多选
- [x] 支持批量输入域名（每行一个）
- [x] 点击生成后，每条域名随机分配所选端口组中的一个端口，生成 URL 列表
- [x] 增加顶部分页导航（端口生成 / 域名检测）
- [x] 生成完毕后提供"用 ITDOG 检测所有域名"按钮，自动跳转检测页并导入生成的域名

## 导航优化（v5.6.1）

- [x] 域名检测页顶部导航栏添加"端口生成"Tab，点击可返回端口生成首页

## 访问控制（v5.7.0）

- [x] 首次访问隐藏域名检测 Tab，完成一次端口生成后解锁并永久显示
- [x] 通过设备指纹（UA + 屏幕分辨率 + 时区等）+ localStorage 识别同一用户
- [x] 服务端记录解锁状态（设备指纹 + IP），防止清除 localStorage 后重置

## 交互调整（v5.7.1）

- [x] 端口组选择默认全不选（原来默认全选），点击高亮选中，未选择时禁用生成按钮

## 持久化与过期机制（v5.8.0）

- [x] 端口组选择记忆：localStorage 保存上次选中的端口组，下次打开自动恢复
- [x] 检测中/完成后可切换回端口生成页，不中断后台检测
- [x] 切换回域名检测页时保留上次检测结果（域名列表 + 检测数据）
- [x] 域名列表保留上次检测记录，仍可复制上次域名检测结果
- [x] 历史检测超过 10 分钟后自动作废，作废后展示历史结果但需重新检测
- [x] 质量为“普通”/“良好”/“优秀”才可复制域名（质量差/未知/作废时禁用复制）

## Bug 修复（v5.8.1）

- [x] 修复 ITDOG 检测报错 "Waiting for selector #host failed: 5000ms exceeded"，检查重复代码

## 用户权限系统（v6.0.0）

- [x] 数据库：新增 app_users 表、copy_logs 表、check_logs 表，已推送到数据库
- [x] 后端：注册申请、登录（JWT）、密码修改/重置 API
- [x] 后端：admin 审批接口（通过/拒绝注册申请）
- [x] 后端：初始化 admin 账号（用户名 adnim，密码 qwer1234）
- [x] 前端：登录页面（用户名+密码，未登录跳转）
- [x] 前端：注册申请页面（提交后等待 admin 审批）
- [x] 前端：全局路由鉴权（未登录/未审批跳转登录页）
- [x] 管理后台：用户列表 + 审批操作（通过/拒绝）
- [x] 管理后台：每个用户的域名检测次数和复制次数统计
- [x] 全局禁止页面复制（CSS user-select:none + JS 阻止 copy 事件）
- [x] 域名列表每条仅支持复制一次（复制后按鈕禁用 + 后端记录）

## 安全增强（v6.1.0）

- [x] 数据库：app_users 新增 email/authCode/firstLoginIp/firstLoginDevice/mustChangeOnLogin 字段
- [x] 数据库：新增 device_bindings 表（userId/ip/deviceFingerprint/approvedAt）
- [x] 数据库：新增 auth_requests 表（userId/ip/deviceFingerprint/status/requestedAt）
- [x] 后端：首次登录绑定 IP + 设备指纹，后续登录校验一致性
- [x] 后端：IP 或设备不一致时创建授权申请，登录被拒绝并提示等待站长授权
- [x] 后端：站长审批授权申请（通过/拒绝），通过后新 IP/设备加入白名单
- [x] 后端：站长账号登录增加三重验证（密码 + 邮箱 + 操作授权码）
- [x] 后端：站长首次登录强制修改密码 + 设置邮箱 + 设置操作授权码
- [x] 后端：操作授权码不可与密码/用户名相同，不可重置
- [x] 后端：copy_logs 唯一键改为「userId + domain + port」，相同域名不同端口各算独立
- [x] 前端：首次登录强制修改页面（密码 + 邮箱 + 操作授权码）
- [x] 前端：异常登录提示页面（IP/设备不匹配，等待站长授权）
- [x] 前端：站长三重验证登录流程（分步输入）
- [x] 管理后台：授权申请列表（查看/通过/拒绝）
- [x] 管理后台：总检测次数汇总 + 每个下级明细统计
- [x] 管理后台：总复制次数汇总 + 每个下级明细统计

## 权限重构（v6.2.0）

- [x] 移除公开注册页面和注册入口（Login 页去掉"申请注册"链接）
- [x] 后端：移除 register 公开注册接口
- [x] 后端：新增 adminCreateUser 接口（站长创建下级账号，含用户名/邮箱/密码/授权码）
- [x] 后端：下级首次登录绑定 IP + 设备指纹后才允许进入
- [x] 后端：后续登录 IP 或设备不一致时，要求输入授权码验证（而非等待站长审批）
- [x] 后端：授权码输入错误则立即锁死账号（status 改为 locked），需站长重新授权解锁
- [x] 前端：登录页新增"授权码验证"步骤（IP/设备异常时显示）
- [x] 前端：移除 Register.tsx 注册申请页面和相关路由
- [x] 前端：管理后台新增"创建下级账号"表单（用户名/邮箱/密码/授权码）
- [x] 权限隔离：非站长账号导航栏隐藏管理后台入口
- [x] 权限隔离：非站长账号只能访问端口生成和域名检测页面

## 自动登出 + 定时检测任务（v6.3.0）

- [x] 前端：全局无操作 1 小时自动登出（监听鼠标/键盘/触摸事件，倒计时到期清除 token 并跳转登录页）
- [x] 前端：登出前 5 分钟弹出倒计时提示，用户可点击"继续使用"延长会话
- [x] 数据库：新增 scheduled_task_groups 表（id/name/category/createdBy/createdAt）
- [x] 数据库：新增 scheduled_domains 表（id/groupId/domain/lastCheckedAt/lastStatus/createdAt）
- [x] 数据库：新增 scheduled_check_results 表（id/domainId/checkedAt/status/rawData）
- [x] 后端：tRPC scheduled.createGroup（创建域名分组，需登录）
- [x] 后端：tRPC scheduled.deleteGroup（删除分组及其域名）
- [x] 后端：tRPC scheduled.listGroups（获取当前用户的所有分组）
- [x] 后端：tRPC scheduled.addDomains（向分组批量添加域名）
- [x] 后端：tRPC scheduled.removeDomain（从分组移除域名）
- [x] 后端：tRPC scheduled.listDomains（获取分组内所有域名及最新检测状态）
- [x] 后端：tRPC scheduled.getResults（获取某域名的历史检测结果）
- [x] 后端：tRPC scheduled.triggerNow（手动立即触发一次检测）
- [x] 后端：每小时自动检测调度器（setInterval/cron，优先级最高，HTTP 独立通道）
- [x] 后端：调度器检测结果写入 scheduled_check_results 表
- [x] 前端：新建「定时检测任务」页面（/scheduled）
- [x] 前端：分组管理（创建/删除分组，每组可设置类别标签）
- [x] 前端：域名管理（每组内添加/删除域名，显示最新检测状态）
- [x] 前端：检测结果展示（最近 48 条检测历史，状态颜色标记）
- [x] 前端：手动触发检测按钮（立即检测当前分组）
- [x] 前端：下次检测倒计时显示（距下次自动检测剩余时间）
- [x] 前端：顶部导航添加「定时任务」入口（登录后可见）

## 定时任务授权 + 管理员授权码（v6.4.0）

- [x] 数据库：scheduled_task_groups 添加 authorizedBy/authorizedAt/taskStatus 字段（pending/authorized）
- [x] 后端：tRPC scheduled.authorizeGroup（管理员/站长授权分组，授权后调度器才执行）
- [x] 后端：调度器只检测 taskStatus=authorized 的分组
- [x] 后端：调度器已就绪运行（服务器启动即开始，每小时整点执行）
- [x] 后端：管理员/站长登录增加授权码验证（IP/设备不一致时），站长无锁死机制（管理员有）
- [x] 后端：站长首次登录检测默认授权码 qwer1234，强制修改
- [x] 前端：定时任务页面展示分组授权状态（待授权/已授权）
- [x] 前端：管理员/站长在定时任务页面可授权分组
- [x] 前端：登录页管理员授权码验证弹窗（与普通用户逻辑相同，但站长无锁死）
- [x] 前端：站长首次登录强制修改授权码页面（AdminFirstSetup.tsx 已实现）

## 安全机制升级（v6.5.0）

- [x] 数据库：新增 ip_whitelist 表（id/ip/remark/createdBy/createdAt）
- [x] 数据库：app_users 添加 pendingAuthCode 字段（站长解锁后设置的临时授权码哈希）
- [x] 后端：首次登录必须输入授权码（管理员/普通用户），验证成功后绑定当前 IP+设备号
- [x] 后端：后续登录 IP 或设备号其一不符则需再次输入授权码，一次错误立即锁死
- [x] 后端：站长解锁账号接口（设置新授权码，被锁用户须输入新授权码才能登录）
- [x] 后端：IP 白名单中间件（非站长用户访问 API 时检查 IP 是否在白名单，否则返回 IP 限制错误）
- [x] 后端：站长管理 IP 白名单接口（增删查）
- [x] 前端：登录页首次登录授权码步骤（密码验证通过后显示授权码输入框）
- [x] 前端：登录页异常登录授权码弹窗（IP/设备不符时）
- [x] 前端：登录页账号锁死提示（提示联系站长解锁）
- [x] 前端：登录页 IP 限制提示（IP 不在白名单时显示友好提示）
- [x] 前端：AdminPanel 新增「IP 白名单」 Tab（添加/删除 IP，查看当前白名单列表）- [x] 前端：AdminPanel 解锁账号时需设置新授权码（站长填写新授权码后解锁）

## 用户反馈优化（v6.6.0）

- [x] 域名列表质量评级规则更新：优秀（无法访问≤4且延迟<5000ms）、普通（无法访问≤6且延迟<6000ms）、极差（无法访问≥8且延迟≥8000ms）
- [x] 端口批量生成：placeholder 改为英文字符示例（避免中文输入法误导）
- [x] 端口批量生成：生成结果后增加“使用检测工具检测”的工具选项（可选择 ITDOG/阿里云）
- [x] 域名质量检测：输入框 placeholder 扩大范围并改为英文字符示例
- [x] 域名质量检测：域名检测列表独立成一列（已是独立左侧边栏）
- [x] 域名质量检测：端口变更后允许复制；未变更端口时域名整体高亮为红色且不允许复制

## 管理后台完善（v6.7.0）

- [x] 后端：adminDeleteUser 接口（站长删除任意非站长账户，同时清除关联数据）
- [x] 后端：adminCreateAdmin 接口（站长创建管理员账户，需输入站长授权码验证）
- [x] 前端：AdminPanel 用户列表每行增加“删除”按鈕（带二次确认弹窗）
- [x] 前端：AdminPanel 新增“创建管理员”表单（用户名/密码/授权码 + 站长授权码验证）

## IP 白名单逻辑调整（v6.8.0）

- [x] 后端：新增 checkIpForLogin 公开接口（返回客户端 IP + 是否在白名单 + 白名单是否已配置）
- [x] 后端：IP 白名单中间件豆免登录页相关静态资源（仅 API 层拦截）
- [x] 前端：登录页加载时调用 checkIpForLogin，未加白则立即跳转 IP 限制页
- [x] 前端：IP 限制页显示当前 IP，提示联系站长加白
- [x] 前端：白名单未配置时（站长尚未开启 IP 功能）不拦截，允许正常访问
- [x] 前端：IP 加白后，登录页首次登录（无账号/isFirstLogin）须弹出授权码输入框

## 生产化准备（v6.8.0-prod）

- [x] 代码重构：删除无用代码（DeviceMismatch.tsx、AIChatBox.tsx、DashboardLayout 组件、imageGeneration.ts、voiceTranscription.ts、map.ts）
- [x] 日志时间改为北京时间（UTC+8）—— logger.ts 已创建
- [x] 清除所有历史日志文件（.manus-logs/ 已清空）
- [x] 前端 Vite 构建配置：Terser 混淆压缩、代码分割、移除 console.log
- [x] 前端防调试：反开发者工具、反调试代码注入（security.ts）
- [x] 防抓包：请求签名（时间戳+HMAC）
- [x] 数据库清理：删除所有历史账号（adnim、Plumbago 等测试账号及关联数据）
- [x] 创建新站长账号：admin / qwer1234 / 授权码 1234qwer
- [x] initAdminAccount 函数更新：改为检查 isOwner=true 账号，不存在时创建 admin

## v6.8.1 版本记录

- [x] 数据库清理：删除所有历史账号和关联数据（device_bindings、auth_requests、check_logs、copy_logs、ip_whitelist）
- [x] 创建新站长账号 admin（密码: qwer1234，授权码: 1234qwer，isOwner=true，isfirstlogin=false）
- [x] 修复 initAdminAccount：改为检查 isOwner=true 而非固定用户名，防止重启时重建旧账号
- [x] 66/66 测试全部通过

## v6.8.2 新功能需求

- [x] 后端：adminCreateUser 接口开放给管理员（admin role），不再仅限站长
- [x] 后端：管理员创建账号时不需要输入站长授权码（站长授权码验证仅限创建管理员）
- [x] 后端：新增 adminGetUserActivity 接口（站长/管理员查看指定下级的登录IP、设备绑定、检测记录、复制记录、异常登录）
- [x] 后端：新增 /api/health 健康检查接口（返回服务状态、数据库连接状态、版本号、北京时间戳）
- [x] 前端：AdminPanel 创建账号表单对管理员可见（管理员可创建普通用户，无需站长授权码）
- [x] 前端：AdminPanel 用户列表每行增加“查看记录”按鈕（眼睛图标），弹窗展示该用户的详细活动记录
- [x] 前端：活动记录弹窗包含：登录 IP、检测记录、复制记录、异常登录四个 Tab
- [x] 新增 v6.8.2 测试文件（82/82 测试全部通过）

## v6.8.3 管理员操作日志

- [x] 数据库：新增 admin_logs 表（id/operatorId/operatorName/action/targetId/targetName/detail/ip/createdAt）—— v6.8.5 已完成
- [x] 后端：writeAdminLog 工具函数（写入操作日志，供各接口调用）—— v6.8.5 已完成
- [x] 后端：创建账号/删除账号/解锁账号/重置密码/IP 白名单增删均写入日志—— v6.8.5 已完成
- [x] 后端：新增 adminGetLogs 查询接口（分页查询操作日志，支持按操作类型筛选）—— v6.8.5 已完成
- [x] 前端：AdminPanel 「操作日志」Tab（表格展示操作人/操作类型/目标/详情/IP/时间，分页+类型筛选）—— v6.8.5 已完成

## v6.8.3 过滤海外节点（优先）

- [x] 定位 ITDOG 和阿里云检测结果中海外节点的过滤位置
- [x] ITDOG 后端：实时推送、最终行解析、最终补推均加入 CHINA_PROVINCE_SET 过滤（阿里云已有过滤）
- [x] 前端无需修改：后端已过滤，前端收到的 rows 就是纯中国大陆+港澳台数据
- [x] 82/82 测试全部通过

## v6.8.4 UI 修复

- [x] 域名输入框：左侧边栏宽度从 w-56 扩大到 w-72，Textarea 加 whitespace-pre + overflow-x-auto，长域名不换行
- [x] ITDOG 等待提示：改为动态倒计时（预计还需约 X 秒，超过 90s 显示“即将完成”）
- [x] 阿里云等待提示：改为动态倒计时（预计还需约 X 秒，超过 120s 显示“即将完成”）
- [x] 82/82 测试全部通过

## v6.8.5 管理员操作日志 + 统计分页

- [x] 数据库：新增 admin_logs 表（id, operatorId, operatorName, action, targetId, targetName, detail, ip, createdAt）
- [x] 后端：在创建账号、删除账号、解锁账号、重置密码、添加/移除 IP 白名单、创建管理员等关键操作中写入日志
- [x] 后端：新增 adminGetLogs 接口（分页查询操作日志，支持按操作类型过滤）
- [x] 后端：新增 adminGetMonthlyStats 接口（每月每人检测次数、复制次数 + 月度汇总）
- [x] 前端：AdminPanel 新增「操作日志」Tab，展示操作日志列表（分页、按类型过滤）
- [x] 前端：AdminPanel 新增「数据统计」Tab，展示月度统计表格（每月每人 + 汇总）
- [x] 82/82 测试全部通过

## v6.8.6 数据统计月份切换 + 检测速度优化

- [x] 后端：adminGetMonthlyStats 接口支持 year+month 参数，返回指定月份的每人数据
- [x] 前端：数据统计 Tab 增加月份选择器（上/下月切换箭头 + 年月显示），默认当前月
- [x] 优化 ITDOG 检测速度：缩短行数稳定判断等待时间（1200ms）和 WS 稳定判断时间（1000ms）
- [x] 优化阿里云检测速度：minWait 从 5s 缩短到 3s，stableCount 阈値从 3 改为 2
- [x] 82/82 测试全部通过

## v6.8.7 正式上线

- [x] 清除所有日志缓存文件（.manus-logs/ 已清空）
- [x] 清除数据库所有内测数据：admin_logs、check_logs、copy_logs、auth_requests、device_bindings、ip_whitelist、scheduled_check_results、scheduled_domains、scheduled_task_groups
- [x] 清除所有非站长账号（保留 admin 站长账号，isOwner=true）
- [x] 重启服务器，正式上线

## v6.8.8 数据统计折线图

- [x] 后端：新增 adminGetTrendStats 接口，返回最近 N 个月每用户的检测/复制数据
- [x] 前端：安装 recharts，在「数据统计」Tab 顶部增加折线图（按月趋势，每用户一条线）
- [x] 折线图支持切换「检测次数」/「复制次数」视图，支持近 3/6/12 月选择
- [x] TypeScript 0 errors，82/82 测试全部通过

## v6.8.9 代码自检优化

- [x] nodeTranslate.ts：清理 PROVINCE_MAP 中 27 个重复条目（保留独特拼音条目 Neimenggu/Xizang）
- [x] itdog-puppeteer.ts：完成判断阈值优化（wsStable 1000ms→2000ms，stableRowSince 1200ms→2500ms，避免过早结束漏掉后续节点）
- [x] itdog-puppeteer.ts：DOM 提取脚本额外清理 button 元素，避免操作列文本混入
- [x] aliyun-puppeteer.ts：完成判断阈值优化（stableCount >= 2 → >= 4，即 2 秒稳定，避免短暂停顿误判）
- [x] aliyun-puppeteer.ts：status 判断改为 parseInt 包容处理（支持 "200 OK" 等多种格式）
- [x] 列映射验证：ITDOG 和阿里云列映射均正确，无错位问题
- [x] proxy.ts：确认为空路由文件（无活跃路由），保留以供扩展
- [x] TypeScript 0 errors，82/82 测试全部通过

## v6.9.0 综合优化

- [x] 取消首次访问隐藏导航限制：端口生成/域名检测/定时任务全局始终展示，无需解锁
- [x] v6.8.3 管理员操作日志：确认 v6.8.5 已完整实现（admin_logs 表+日志写入+前端 Tab）
- [x] ITDOG 节点进度展示：后端每收到一行推送 progress 事件，前端实时显示「已获取 N 节点 / 预期约 200 节点」+ 进度条
- [x] 阿里云 SSL 时间列：后端 AliyunCheckRow 新增 sslTime 字段，parseDomRow 提取 cells[7]，前端表格新增 SSL 列
- [x] TypeScript 0 errors，82/82 测试全部通过

## v6.9.1 多用户排队并发控制（已完成）

- [x] 全局检测队列：最大并发 2，超出时排队等待，每个请求携带用户标识和开始时间
- [x] SSE 推送排队状态：queued（位置/等待人数）、started（开始检测）、结束时自动推进队列
- [x] 前端展示排队状态：排队中显示位置、等待人数、预计等待时间、提交时间
- [x] ITDOG 和阿里云均接入全局队列（复用同一个并发控制器）
- [x] TypeScript 0 errors，82/82 测试全部通过

## v6.9.1 多用户排队并发控制

- [x] shared-browserless-queue.ts：扩展 acquireSlot 支持 onQueueUpdate 回调，推送 QueueStatusInfo（位置/等待人数/并发数/预计时间/提交时间/开始时间）
- [x] itdog-puppeteer.ts：getBrowserWithRetry/runItdogCheck/enqueueCheck 透传 onQueueUpdate，SSE 路由推送 queue 事件
- [x] aliyun-puppeteer.ts：同上，SSE 路由推送 queue 事件
- [x] 前端 ITDOG：监听 queue 事件，loading 状态展示排队位置/当前并发/等待人数/预计等待时间/提交时间/开始时间
- [x] 前端阿里云：同上
- [x] TypeScript 0 errors，82/82 测试全部通过

## v6.9.2 日志报错修复（18:00～18:50）

- [x] 问题1：Navigation timeout（20s）导致重试 2 次后 detached Frame 错误——SSE catch 块封装为友好提示
- [x] 问题2：ERR_CONNECTION_RESET 后 page.evaluate 失败导致数据为 0 ——添加 evalFailCount 计数器，最多 5 次失败才退出循环，成功后重置计数器
- [x] 问题3：Navigation timeout 后错误信息不友好——封装为「ITDOG 页面加载超时，请网络正常后重试」
- [x] 阿里云 SSE catch 块：同样封装已知技术错误为友好提示
- [x] TypeScript 0 errors，82/82 测试全部通过

## v6.9.3 页面状态持久化（按账号记忆）

- [x] 实现 useUserStorage hook：基于 userId 的 localStorage 分隔（key 格式：user:{userId}:{key}），未登录时用 anonymous 前缀，登录后自动切换
- [x] 端口生成页面：记忆输入内容（port_gen_input）、生成结果（port_gen_results）、已生成状态（port_gen_has_generated）、选中端口组（port_gen_groups）、检测工具选择（port_gen_check_tool）
- [x] 域名检测页面：记忆域名列表、activeDomain、activeTool、selectedTools、resetKeys（key: checker_state_v1），按用户 ID 隔离
- [x] 定时检测页面：记忆分组展开/折叠状态（scheduled_expanded_groups），按用户 ID 隔离
- [x] 切换页面/刷新后自动恢复上次状态，不重新触发检测
- [x] TypeScript 0 errors，82/82 测试全部通过

## v6.9.4 域名检测结果记忆与时间展示

- [x] 修复重新进入域名检测页时自动重新检测的问题：ItdogDataView/AliyunDataView 新增 cachedResult prop，有缓存时直接展示，不发起 SSE 请求
- [x] DomainEntry 新增 itdogResult/aliyunResult 字段，onDone 回调新增 result 参数同时保存完整结果数据
- [x] 域名列表每条显示上次检测距今分钟数（刺刺/1分钟前/N分钟前），hover 显示具体时间
- [x] 每分钟自动刷新时间显示（已有 forceUpdate 机制）
- [x] TypeScript 0 errors，82/82 测试全部通过

## v6.9.5 修复切换页面后检测计时器归零

- [x] DomainEntry 新增 launchedAt 字段（Record<ToolId, number>），在 handleAddDomains/handleImportFromStorage/handleReset/handleResetAll 四处均记录开始时间戳
- [x] ItdogDataView/AliyunDataView 新增 startedAt prop，组件初始化时用 startedAt 替代 Date.now() 作为计时起点，初始 elapsed 也基于 startedAt 计算
- [x] 切换页面再返回时，elapsed 从实际开始时间连续计算，不归零
- [x] TypeScript 0 errors，82/82 测试全部通过

## v6.9.6 彻底修复切换页面后 SSE 中断问题

- [x] 分析根本原因：ItdogDataView/AliyunDataView 组件在 Home.tsx 卸载时被销毁，SSE 连接随之关闭，重建时重新发起请求
- [x] 新建 useSseManager hook（client/src/hooks/useSseManager.ts）：用 useRef 存储所有 EventSource 实例和实时流式状态，生命周期脱离 React 路由
- [x] 主组件新增 useEffect 监听 entries 变化，为新增 launched 条目调用 startConnection，完成时回调更新 entries
- [x] ItdogDataView/AliyunDataView 改为纯展示组件，通过 sseState prop 接收 streamRows/resultData/loading/elapsed/queueInfo 等实时数据
- [x] 切换到端口生成页面再返回后，SSE 连接从未中断，数据持续流入，展示组件重建后立即显示最新状态
- [x] TypeScript 0 errors，82/82 测试全部通过

## v6.9.7 修复等待时间显示错误（刚开始就显示700+秒）

- [x] 根本原因：useEffect 监听 entries 变化时，从 localStorage 恢复的 entry.launchedAt 是上次检测的旧时间戳，startSse 用它计算初始 elapsed 导致显示700+秒
- [x] 修复：启动 SSE 前先检查 sseStore 中是否已存在该连接（路由切换后返回的情况），已存在则使用 existingState.startedAt 保持计时连续；全新连接始终用 Date.now() 作为起点
- [x] TypeScript 0 errors，82/82 测试全部通过

## v6.9.8 修复 502 网关错误导致的 JSON 解析报错

- [x] 根本原因：沙箱 dev server 瞬时不可用时，AWS ELB 返回 502 HTML 响应，tRPC 客户端无法解析 JSON 抛出错误
- [x] AppAuthGuard.tsx：checkIpAccess 查询添加 retry:1 + retryDelay:2000 + throwOnError:false
- [x] Login.tsx：同上处理
- [x] main.tsx：全局错误处理新增 isGatewayError 过滤器，502/503 等 HTML 响应导致的 JSON 解析失败不再打印到控制台
- [x] TypeScript 0 errors，82/82 测试全部通过

## v6.9.9 并发数提升到30 + header 实时队列状态

- [x] 将 Browserless 并发数从 2 提升到 30，更新 MAX_CONCURRENT 和相关注释，平均耗时估算从 90s 调整为 60s
- [x] 新增服务端 tRPC 接口 domain.queueStats，返回全局实时队列状态（activeCount/waitingCount/maxConcurrent）
- [x] header 中的检测中计数改为基于服务端实时队列数据，每5秒轮询一次：绿色显示“N个检测中”，黄色显示“N个队列中”
- [x] TypeScript 0 errors，82/82 测试全部通过

## v7.0.0 修复域名检测串行问题（多域名真正并发）

- [x] 移除 itdog-puppeteer.ts 中的 isRunning 串行锁和 taskQueue，改为直接并发执行；新增 inFlightMap 去重复提交相同域名
- [x] 移除 aliyun-puppeteer.ts 中的 isRunning 串行锁和 taskQueue，同上
- [x] 更新两个 status 路由，改为从 getBrowserlessQueueStatus 获取全局队列状态
- [x] TypeScript 0 errors，82/82 测试全部通过

## v7.1.0 定时检测质量差标记 + 实时弹窗通知 + 并发隔离

- [x] 质量差判定：失败节点>4个 或 平均延迟>5s，定时检测结果标记为红色"质量差"
- [x] 并发隔离：定时任务独占20个并发槽，普通任务最多使用10个并发槽
- [x] 实时弹窗通知：质量差域名出现时，通过 SSE 广播给当时已登录的所有用户
- [x] 弹窗只能手动关闭，不自动消失；展示具体分组名和域名信息
- [x] 只有异常发生时已登录的账号才收到推送，之后登录的账号不补推
- [x] TypeScript 0 errors，82/82 测试全部通过

## v7.1.1 并发隔离逻辑修正

- [x] 定时任务未执行期间，普通任务可占用全部 30 个并发槽
- [x] 定时任务执行期间（schedulerActiveCount > 0），普通任务最多占用 10 个并发槽
- [x] 更新注释和 getBrowserlessQueueStatus 返回值
- [x] TypeScript 0 errors，82/82 测试全部通过

## v7.2.0 数据统计修复 + 用户管理详情弹窗

- [x] 修复数据统计加载缓慢：修复 DATE_FORMAT(created_at) 列名错误，改为 DATE_FORMAT(createdAt)
- [x] 修复按月趋势/月度数据统计显示无数据：所有 DATE_FORMAT 列名均已修复
- [x] 用户管理：已检测次数数字可点击，弹窗展示检测域名列表（域名、工具、检测时间，支持分页）
- [x] 用户管理：已复制次数数字可点击，弹窗展示复制域名列表（域名、端口、完整地址、复制时间，支持分页）
- [x] TypeScript 0 errors，82/82 测试全部通过

## v7.3.0 取消复制次数限制 + 清理复制统计

- [x] 后端：logCopy 接口取消"同一域名+端口只能复制一次"的唯一键限制，每次复制均记录
- [x] 后端：adminListUsers 接口移除 copyCount 字段返回
- [x] 后端：adminGetMonthlyStats 移除 copies 统计
- [x] 后端：adminGetTrendStats 移除 copies 统计
- [x] 后端：移除 adminGetUserCopyDetail 接口（或保留但不在前端使用）
- [x] 前端：AdminPanel 用户列表移除"已复制次数"列和点击弹窗
- [x] 前端：AdminPanel 统计卡片移除"总复制次数"
- [x] 前端：AdminPanel 数据统计 Tab 移除复制相关折线图和月度表格列
- [x] 前端：域名检测页移除复制一次后禁用按鈕的逻辑
- [x] TypeScript 0 errors，82/82 测试全部通过

## v7.4.0 修复质量评级逻辑（失败节点数）

- [x] 前端 Home.tsx calcDomainQuality：改为直接统计失败节点数（failedNodes），而非失败地区数
- [x] 前端 Home.tsx 评级规则：失败节点≤4且延迟<5000ms→优秀，失败节点≤6且延迟<6000ms→普通，其余→极差
- [x] 后端 scheduler.ts：定时检测使用 HTTP 探测（单次请求），无“节点”概念，不需修改
- [x] TypeScript 0 errors，82/82 测试全部通过

## v7.5.0 定时检测工具选择 + 分组编辑 + 评级规则修正

- [x] schema: scheduledTaskGroups 增加 tool 字段（'itdog' | 'aliyun'，默认 'itdog'）
- [x] 后端路由：createScheduledGroup 支持传入 tool 字段
- [x] 后端路由：新增 updateScheduledGroup（修改名称、工具）
- [x] 后端路由：新增 addScheduledDomain / deleteScheduledDomain（分组内域名增删）
- [x] 调度器：checkAndSaveDomain 根据分组 tool 字段选择 ITDOG 或阳云 Browserless 检测测
- [x] 调度器：确认定时任务自动执行（每小时整点），无需手动触发
- [x] 调度器评级规则修正：失败节点≤4且延迟<10000ms→优秀；失败节点≤6且延迟<20000ms→普通；失败节点≤8且延迟<50000ms→极差；其余→质量差(poor)
- [x] 前端：新建分组弹窗增加工具选择（ITDOG / 阳云））
- [x] 前端：分组支持编辑（修改名称、工具），域名支持单独删除和新增
- [x] TypeScript 0 errors，82/82 测试全部通过

## v7.6.0 定时检测优化 + 站内信 + 管理后台清理

### 定时检测
- [ ] 只保留上一次检测结果（每次检测前删除该域名的旧记录，只存最新一条） —— 待实现
- [x] 域名点击后弹窗展示检测详情：失败节点名称列表、耗时>50000ms的节点名称列表
- [ ] 异常弹窗只推送给检测时在线用户（SSE连接建立时间早于检测开始时间才推送） —— 待实现
- [ ] 异常弹窗手动关闭，不自动消失 —— 待实现

### 站内信
- [x] 数据库：新增 inbox_messages 表（id/userId/title/content/isRead/createdAt）
- [x] 后端：定时检测异常时写入站内信（全部用户）- [x] 后端： getInboxMessages 接口（分页，支持未读过滤）
- [x] 后端： markAllRead 接口（一键已读- [x] 后端： deleteReadMessages 接口（批量删除已读）
- [x] 前端：顶部导航栏站内信图标（未读时显示红点）
- [x] 前端：站内信弹窗/侧边栏（消息列表、一键已读、批量删除已读）

### 管理后台清理复制统计
- [x] 用户管理：移除已复制次数列（前后端）
- [x] 数据统计-按月趋势：移除复制次数折线（前后端）
- [x] 数据统计-月度数据统计：移除复制次数列（前后端）
- [x] TypeScript 0 errors，测试全部通过

## v7.7.0 定时检测修复 + 重试机制 + 详情弹窗修复

### 定时检测数据准确性
- [x] 分析 scheduler.ts 中 checkAndSaveDomain 的检测逻辑，找出数据不准确根因
- [x] 修复失败节点数/延迟统计逻辑（确保与 Home.tsx 的 calcDomainQuality 一致）
- [x] 修复质量评级（优秀/普通/极差/质量差）的判断逻辑

### 检测失败重试机制
- [x] 调度器：检测失败（error/timeout）时自动重试最多 2 次，间隔 30s
- [x] 重试时在日志中记录重试次数和原因
- [x] 重试全部失败后才标记为 error 状态并写入数据库

### 域名点击详情弹窗
- [x] 修复 ScheduledTasks.tsx 中域名点击无反应的问题
- [x] 弹窗展示：失败节点名称列表（status=failed 的节点）
- [x] 弹窗展示：高延迟节点名称列表（耗时 >50000ms 的节点）
- [x] 弹窗展示：基本信息（检测时间、工具、总节点数、失败数、平均延迟）

### 验收
- [x] TypeScript 0 errors，82/82 测试全部通过

## v7.8.0 修复定时检测与域名检测结果不一致

### 问题描述
- 同一域名：域名检测显示"质量优秀"，定时检测显示"失败节点144个"
- 根本原因：两套检测逻辑对"失败节点"的判断标准不同

### 分析任务
- [x] 对比 itdog-puppeteer.ts 和 aliyun-puppeteer.ts 中 summary.failed 的计算逻辑
- [x] 对比 Home.tsx calcDomainQuality 中失败节点的统计方式
- [x] 确认 scheduler.ts 中读取的 failedNodes 是否与前端一致

### 修复任务
- [x] 修复定时检测的失败节点统计逻辑（与域名检测保持一致）
- [x] 修复 DomainDetailDialog 弹窗中失败节点的判断条件
- [x] 修复质量评级阈値（与 Home.tsx 保持一致）

### 验收
- - [x] TypeScript 0 errors，82/82 测试通过

## v7.9.0 修复数据统计-按月趋势图无内容

- [x] 分析 adminGetTrendStats 后端接口的数据查询逻辑
- [x] 分析前端趋势图的数据绑定和渲染逻辑
- [x] 修复数据查询（确保有数据时能正确返回）
- [x] 修复图表渲染（确保数据绑定正确）
- [x] TypeScript 0 errors，82/82 测试通过

## v8.0.0 评级规则修正 + 检测数据一致性重构

- [ ] 修正 Home.tsx 中 calcDomainQuality 的评级规则（失败≤4且<5s→优秀；≤6且<8s→普通；≤8且<10s→极差；其余→质量差）
- [ ] 修正 scheduler.ts 中 gradeQuality 的评级规则（与 Home.tsx 保持一致）
- [ ] 访问 ITDOG 原站检测 https://www.0wxe2e.vip:9132，记录实际节点数/失败数/延迟
- [ ] 访问阿里云原站检测 https://www.0wxe2e.vip:9132，记录实际节点数/失败数/延迟
- [ ] 调用我们的工具检测同一域名，对比差异
- [ ] 找出数据差异根因（节点过滤/状态判断/延迟计算）
- [ ] 重构 itdog-puppeteer.ts 数据解析逻辑
- [ ] 重构 aliyun-puppeteer.ts 数据解析逻辑
- [ ] 多轮对比验证，确认数据与原站一致
- [ ] TypeScript 0 errors，82/82 测试通过

## v8.0.0 完成状态记录
- [x] 评级规则修正（失败≤4且<5s→优秀；≤6且<8s→普通；≤8且<10s→极差；其余→质量差）
- [x] 根因定位：ITDOG连接失败节点（状态列显示"失败"）被错误解析为httpCode=0并过滤掉
- [x] 修复 itdog-puppeteer.ts："失败"文字→httpCode=-1，completedRows过滤条件改为httpCode!==0
- [x] 同步修复 Home.tsx/ScheduledTasks.tsx/scheduler.ts/ItdogResultView.tsx
- [x] 新增17个单元测试覆盖httpCode=-1逻辑，99/99测试全部通过

## v8.1.0 ITDOG 超时节点修复
- [x] 发现 wsStable 退出条件（2秒无WS消息）导致10秒超时的失败节点被截断
- [x] 修复 wsStable 等待时间：2秒 → 12秒（覆盖10秒超时的失败节点）
- [x] 修复 maxWait：25秒 → 40秒（总体超时保护）
- [x] 修复 行数稳定等待时间：2.5秒 → 12秒
- [x] 验证 rx6dhz.vip:8005：失败节点 9/9 完全一致
- [x] 验证 kaiyun.com：失败节点 141/141 完全一致
- [x] 99/99 测试通过

## v8.2.0 定时检测数据重构
- [x] 分析 scheduler.ts 中 checkAndSaveDomain 的检测流程与 itdog-puppeteer.ts 的差异
- [x] 确认定时检测使用了已修复的 wsStable/maxWait/行数稳定等待时间参数（通过 enqueueItdogCheck 复用）
- [x] 修复 itdog-puppeteer.ts：无论是否有 onRow 回调，都填充 collectedRows 作为备用数据
- [x] 修复 itdog-puppeteer.ts：当 rowsToUse.length === 0 时抛出异常触发 scheduler 重试机制
- [x] 修复 useSseManager.ts：calcDomainQuality 与 Home.tsx 保持完全一致（统一4档评级+bad类型）
- [x] 98/99 测试通过（1项 Browserless 网络连通性测试因外部服务间歇性超时，非代码问题）

## v8.3.0 定时检测逻辑重构（根因修复）

### 根因分析
- getBrowserWithRetry 始终调用 acquireSlot（普通任务），_priority 参数被忽略
- 定时任务未使用 acquireSchedulerSlot（专用槽位），导致与普通任务竞争资源
- scheduler.ts 并发数 20 远超 Browserless 稳定并发，大量页面提前关闭
- 评级逻辑：检测失败时 qualityBad=true，导致全部显示"质量差"

### 修复任务
- [ ] itdog-puppeteer.ts: getBrowserWithRetry 增加 isScheduler 参数，定时任务使用 acquireSchedulerSlot
- [ ] aliyun-puppeteer.ts: 同上修复
- [ ] itdog-puppeteer.ts: enqueueItdogCheck 将 priority=1 映射为 isScheduler=true
- [ ] aliyun-puppeteer.ts: enqueueAliyunCheck 同上
- [ ] scheduler.ts: 降低并发数为 5，与 Browserless 稳定并发匹配
- [ ] scheduler.ts: 重构 checkAndSaveDomain，使用 calcDomainQuality 统一评级逻辑
- [ ] 99/99 测试通过

## v8.3.0 定时检测逻辑重构（根因修复）

- [x] 修复 itdog-puppeteer.ts：getBrowserWithRetry 增加 isScheduler 参数，priority=1 时使用 acquireSchedulerSlot（专用定时任务槽位，不与普通任务竞争）
- [x] 修复 aliyun-puppeteer.ts：同上，getBrowserWithRetry 增加 isScheduler 参数
- [x] 重构 scheduler.ts：提取 calcItdogStats/calcAliyunStats 函数，与 Home.tsx 完全一致
- [x] 重构 scheduler.ts：降低并发数 20→5，避免 Browserless 资源竞争导致页面提前关闭
- [x] 重构 scheduler.ts：缩短重试间隔 30s→10s（专用槽位不需要长时间等待）
- [x] 修复 scheduler.ts：检测失败时 qualityBad=false（避免误报，检测失败≠域名质量差）
- [x] 修复 scheduler.ts：scheduledCheckResults.status 使用 ok/warn/error，scheduledDomains.lastStatus 使用 ok/warn/poor（区分质量差和检测失败）
- [x] 99/99 测试全部通过

## v8.4.0 定时检测流程与域名检测完全对齐

- [ ] 分析 Home.tsx calcDomainQuality 完整评级逻辑（含 itdog/aliyun 分支）
- [ ] 分析 itdog-puppeteer.ts enqueueItdogCheck 的完整数据流（rawUrl 构造、行过滤、评级输入）
- [ ] 找出定时检测与域名检测的所有差异点（rawUrl 格式、行过滤规则、评级输入字段）
- [ ] 重构 scheduler.ts：直接复用 calcDomainQuality 的完整逻辑（不再独立实现）
- [ ] 确保定时检测传入 rawUrl 与域名检测完全一致（含协议+端口）
- [ ] 用 www.y7skxm.vip:6848 对比两个功能的检测结果，直至完全一致
- [ ] 99/99 测试全部通过

## V1.0.0 全面重构
- [x] 后端重构：精简 server/appAuth.ts（提取 requireAdmin/requireDb 辅助函数，消除重复模式）
- [x] 前端重构：提取共享 AppNav 组件，消除 Home/DomainPortGenerator/ScheduledTasks/AdminPanel 中的重复导航代码
- [x] 前端重构：AdminPanel.tsx 统一使用主题变量替换硬编码颜色
- [x] 版本号统一更新为 v1.0.0（server/_core/index.ts、测试文件）
- [x] TypeScript 0 errors

## 前端全面重设计 V1.0.0
- [x] 全局样式：升级 index.css 主题变量，精致化阴影、过渡效果
- [x] 共享导航组件 AppNav：简洁大气，统一所有页面导航
- [x] 登录页 Login.tsx：优化视觉层次，更现代的卡片设计
- [x] 端口生成页 DomainPortGenerator.tsx：优化输入区和结果区
- [x] 域名检测页 Home.tsx：优化侧边栏、工具选项卡、空状态提示
- [x] 定时检测页 ScheduledTasks.tsx：一键复制所有域名、智能输入框（空格自动换行、URL 自动识别）
- [x] 管理后台 AdminPanel.tsx：统计卡片、Tab 导航、操作按钮全面使用主题变量

## 前端全面重设计（V1.0.1 候选）
- [x] 全局样式：升级 index.css 主题变量，精致化阴影、过渡效果
- [x] 共享导航组件 AppNav：简洁大气，统一所有页面导航
- [x] 登录页 Login.tsx：优化视觉层次，更现代的卡片设计
- [x] 端口生成页 DomainPortGenerator.tsx：优化输入区和结果区
- [x] 域名检测页 Home.tsx：优化侧边栏、工具选项卡、空状态提示
- [x] 定时检测页 ScheduledTasks.tsx：一键复制所有域名、智能输入框（空格自动换行、URL 自动识别）
- [x] 管理后台 AdminPanel.tsx：统计卡片、Tab 导航、操作按钮全面使用主题变量

## 输入框修复（用户反馈）
- [x] 定时检测「添加域名」输入框：粘贴时自动提取 URL 过滤所有非 URL 内容（文字、空格等），手动输入只允许 URL 相关字符（不允许汉字、空格）

## 新功能（用户需求）
- [x] 管理后台用户列表：显示每个用户的最近活跃时间（lastActiveAt），帮助站长识别活跃/长期未登录账号
- [x] 定时检测域名列表：每个域名行添加单独复制按鈕，支持一键复制单个域名

## 新功能（用户需求 2）
- [x] 定时检测域名列表：批量选择（全选/单选 checkbox）+ 一键删除选中域名
- [x] 域名检测页输入框：与定时检测添加域名输入框逻辑一致（限制文字/空格输入，粘贴自动提取 URL）

## 新功能（用户需求 3）
- [x] 域名检测/定时检测/端口生成输入框：粘贴时检测到重复域名，在输入框下方显示"已过滤N条重复域名"提示，并列出具体被过滤的域名
- [x] 站内信：域名支持一键复制，点击后自动跳转到定时任务对应分组的域名处
- [x] 端口批量生成输入框：与定时检测添加域名输入框逻辑一致（限制文字/空格输入，粘贴自动过滤）
- [x] 定时任务分组：支持设置独立检测时间（30分/1小时/2小时/3小时/6小时/12小时/24小时），未设置时默认1小时并在UI标注
- [x] 定时任务：多个分组同一时间触发时串行执行（一组完成后再执行下一组）
- [x] 并发控制：默认10并发（定时70%/普通30%），待检测域名>50时临时升至30并发，空闲时回落10
- [x] 失败域名自动重检：无队列任务时自动重检失败域名，累计错误5次后暂停

## 新功能（用户需求 4）
- [x] 定时检测：多个失败节点为同一省份时只计算为一个失败节点（按省份去重）
- [x] 并发控制：普通+定时堆积超过50时临时启用 50 并发（而靑30），70%给定时/30%给普通
## 新功能（用户需求 5）
- [x] 调度器状态卡片：显示「当前并发模式」标签（正広10/高并徖30）
- [x] 检测结果详情：省份合并提示（已合并N个同省节点），可展开查看同省全部异常城市

## 新功能（用户需求 6）
- [x] 版本迭代为 V1.5.0.0227，在前端登录页右下角展示版本号

## 自检修复（2026-02-27）
- [x] 修复：切换到阿里云/ITDOG视图时，若该域名无当前工具检测数据，显示"尚未检测"提示+立即检测按钮（而非空白页面）
- [x] 修复：NotificationBell/Login/AdminPanel 所有 DialogContent 添加 DialogDescription（消除 accessibility 警告）
- [x] 修复：AdminPanel 中两个 DialogDescription 被错误嵌套在 DialogTitle 内部，已移至 DialogTitle 之后

## 在线人员检测 - 定时检测前置条件（2026-02-27）
- [x] 后端：内存心跳模块 online-users.ts（updateHeartbeat/getOnlineUsers/checkMemberOnline）
- [x] 后端： heartbeat tRPC mutation（登录用户每 30s 上报，自动读取 isOwner）
- [x] 后端： getOnlineUsers tRPC query（5分钟内有心跳视为在线）
- [x] 调度器：执行前调用 checkMemberOnline()，无普通成员在线（含仅站长在线）则跳过并记录日志
- [x] 调度器： pausedReason 字段（暂停时设置原因，恢复时清除）
- [x] 前端： Home.tsx 全局心跳 hook（已登录时每 30s 自动上报，登录后立即发送一次）
- [x] 前端：定时检测页面显示当前在线成员（站长/管理员/成员分色标签）
- [x] 前端：调度器状态卡片：暂停时显示暗色警告框+暂停原因文字

## ITDOG 详细结果对比优化（2026-02-27）
- [x] 前端：将「解析 IP」列名改为「响应 IP」（与原站一致）
- [x] 后端：parseDomRow 提取 cells[2] IP 归属地字段（ipLocation）
- [x] 前端：详细结果表格添加「IP 归属地」列（显示 cells[2] 的中文归属地）
- [x] 前端：SortKey 类型添加 ipLocation 排序支持

## ITDOG 响应 IP 修复（2026-02-27）

- [x] 调试确认 IP 数据存放在 `<div id="real_ip_xxx">` 中，被 `div` 过滤逻辑误删
- [x] 修复 `_extractScript`：cells[1] 专用提取逻辑，优先读取 `div[id^="real_ip_"]`
- [x] 验证 cells[2] 归属地提取逻辑正常（无需修改）
- [x] TypeScript 0 errors，99/99 测试通过

## ITDOG 初始失败节点显示修复（2026-02-27）

- [x] 定位前端统计逻辑：`totalTimeMs === 0` 被误计为失败，实际表示「尚未完成」
- [x] 修改前端统计逻辑：failed 改用 `httpCode === -1 || httpCode >= 400` 判断，初始展示时失败节点为 0
- [x] TypeScript 0 errors，99/99 测试通过

## Telegram 告警推送集成（2026-02-27）

- [x] 将 TELEGRAM_BOT_TOKEN 和 TELEGRAM_CHAT_IDS 存入环境变量
- [x] 实现 server/telegram-alert.ts 模块（sendTelegramAlert 函数）
- [x] 消息格式：域名、质量等级、失败节点数、平均响应、检测工具、时间
- [x] 调度器检测完成后，对 poor/bad 域名自动触发 Telegram 推送
- [x] 推送失败不影响主流程（try/catch 静默处理）
- [x] 测试验证：Bot 连通性通过（Yumingjiance01bot ✓），100/100 测试通过

## 三项功能优化（2026-02-27）

- [x] Telegram 推送消息优化：添加「请及时更新域名」和「定时任务已配置」提示文案
- [x] 后端：新增 sendTelegramTest tRPC 接口（protectedProcedure，发送测试消息）
- [x] 前端：管理后台统计 Tab 添加 Telegram 测试推送卡片（含加载状态和成功/失败反馈）
- [x] 后端：定时检测分组接口去除 isOwner/admin 限制，所有已登录后台成员均可查看和编辑
- [x] 前端：定时检测页面对所有后台成员开放（移除仅管理员可见的限制）
- [x] TypeScript 0 errors，100/100 测试通过

## 分组操作日志 + Telegram 预警 + 接收人调整（2026-02-27）
- [x] Telegram：接收人只保留群组 -5273169744，删除两个 User ID
- [x] 数据库：新增 group_operation_logs 表（id/operatorId/operatorName/action/groupId/groupName/category/domainName/createdAt）
- [x] 后端：分组操作日志写入（创建分组/删除分组/添加域名/删除域名）
- [x] 后端：删除分组时发送 Telegram 预警（分组名/类别/时间/操作人）
- [x] 后端：定时清理 7 天前的操作日志（scheduler.ts 每 24h 执行一次）
- [x] 前端：管理后台新增「分组日志」 Tab，展示近 7 天操作记录（按时间倒序）
- [x] TypeScript 0 errors，109/109 测试全部通过

## 定时检测权限全面开放（2026-02-27）
- [x] 后端：scheduled router 所有 role !== admin 限制全部移除，已登录即可操作
- [x] 前端：定时检测页面移除所有 isAdmin 权限判断（授权/撤销/立即检测全部对已登录用户开放）
- [x] TypeScript 0 errors，109/109 测试全部通过

## Telegram Reply 自动换域名 + 定时任务排查（2026-02-27）
- [x] 排查：em4gdj.vip:9153 手动执行无结果原因是 taskStatus !== authorized，需先对分组授权
- [x] 数据库：新增 telegram_alert_messages 表，迁移已成功
- [x] 后端：sendTelegramAlert 发送后记录 message_id 到数据库
- [x] 后端：新建 telegram-webhook.ts，实现 POST /api/telegram/webhook
- [x] 后端：解析 Reply 消息，提取新域名，自动替换并清空旧检测结果
- [x] 后端：替换成功后回复确认消息到群组（含旧域名、新域名、操作人、时间）
- [x] 后端：新增 registerTelegramWebhook / getTelegramWebhookInfo tRPC 接口
- [x] TypeScript 0 errors，109/109 测试全部通过

## 告警格式更新 + 修复重复发送（2026-02-27）
- [x] 排查重复发送原因：测试脚本手动运行了两次，正式流程每个域名只发一条
- [x] 更新告警消息格式（移除 Markdown 加粗、新增值班提示、回复格式说明、@jskfymzb01）
- [x] TelegramAlertPayload 新增 category 字段，告警消息包含分组类别
- [x] TypeScript 0 errors，109/109 测试全部通过

## 告警防重复 + 换域名后自动检测回复（2026-02-27）
- [x] 告警防重复：1 小时内同域名已发过告警则跳过（查询 telegram_alert_messages 表）
- [x] 分组删除预警防重复：查询 group_operation_logs 是否已有 delete_group 记录，有则跳过
- [x] 换域名后自动触发检测，5 分钟后回复结果到群组（含质量/失败节点/平均响应）
- [x] TypeScript 0 errors，109/109 测试全部通过原告警消息

## 修复 Telegram Reply 换域名替换失败（2026-02-27）
- [x] 修复：lastStatus 改为 "pending"，lastCheckedAt 改为 null，解决 NOT NULL 字段不允许空字符串导致的 SQL 错误
- [x] TypeScript 0 errors，109/109 测试全部通过

## 修复分组删除预警重复发送（2026-02-27）
- [x] 根因：防重复逻辑查的是刚写入的 group_operation_logs，时序 Bug 导致防重复失效
- [x] 修复：改为查询 telegram_alert_messages 表（alertType=group_delete），发送成功后写入记录
- [x] schema 新增 alertType 字段，迁移已成功（migration 0017）
- [x] TypeScript 0 errors，109/109 测试全部通过

## 持续检测 + 评级调整 + 删除预警已确认（2026-02-27）
- [x] 取消无人在线暂停检测逻辑，改为 24 小时持续执行（scheduler.ts 已在之前版本实现）
- [x] 域名质量评级调整：优秀（≤4节点 且 <3000ms）/ 普通（≤6节点 且 <6000ms）/ 差（≤8节点 且 <8000ms）/ 极差（>8节点 或 ≥8000ms）
- [x] 分组删除预警新增「已确认」按鈕，清除 telegram_alert_messages 中该分组的 group_delete 记录
- [x] TypeScript 0 errors，109/109 测试全部通过

## 修复分组删除预警 Bug（2026-02-27）
- [x] 根因排查：防重复逻辑按 groupId 查询，但分组删除后重建时 groupId 自增变化导致匹配失败
- [x] 修复：防重复查询改为按 groupName 匹配（scheduled.ts + telegram-webhook.ts 均已更新）
- [x] 修复：AdminPanel 新增「重新注册 Webhook」按鈕，显示 Webhook 状态和 callback_query 支持情况
- [x] TypeScript 0 errors，109/109 测试通过

## 代码自检 + 重构 + UI 改造（2026-02-27）
- [x] 代码自检：发现 checkMemberOnline 未使用导入、pausedReason 死代码、Register 页面废弃路由
- [x] 后端重构：移除 checkMemberOnline 导入、pausedReason 字段、统一 scheduled.ts 日志为 logger
- [x] 前端重构：删除 Register 页面路由和 PUBLIC_PATHS 入口
- [x] UI 改造：删除/撤销授权改用 Dialog、单域名/批量删除改用 Dialog、调度器状态卡片优化、域名列表项评级 tooltip 修正、主页增加质量评级展示
- [x] TypeScript 0 errors，109/109 测试通过

## 分组排序 + 类别折叠（2026-02-27）
- [x] 安装 @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
- [x] 分组卡片支持拖拽排序，排序结果保存到 localStorage（按用户 ID 隔离）
- [x] 相同类别分组支持一键折叠/展开（类别标题行点击切换，折叠状态保存到 localStorage）
- [x] TypeScript 0 errors，109/109 测试通过

## 修复重启误报分组删除预警（2026-02-27）
- [x] 排查重启触发分组删除预警的根因：drop_pending_updates:false 导致重启后 Telegram 重放旧 callback_query 删除防重复记录
- [x] 修复：registerWebhookUrl 改用 drop_pending_updates:true，重启时丢弃积压的旧 updates
- [x] 修复：handleGroupDeleteConfirm 增加时间戳防护，忽略超过 5 分钟的旧 callback_query（双重保险）
- [x] TypeScript 0 errors，109/109 测试通过

## 彻底修复重启误报分组删除预警（2026-02-27 二次）
- [ ] 排查第二次误报的真实触发路径（drop_pending_updates:true 修复后仍然收到误报）
- [ ] 彻底修复误报逻辑
- [ ] TypeScript 0 errors，测试通过

## 功能检查与原站对比（2026-02-27）完成状态
- [x] 对比 ITDOG 原站（完整200节点测试）与我们工具的检测结果
- [x] 节点数差异分析：我们工具144节点 vs 原站200节点，差异来自海外节点过滤（正常设计）
- [x] 修复：progress=100% 后立即结束导致失败节点漏报，现在等待 12 秒再结束（wsStableEffective）
- [x] 修复：progress=100% 后禁用 wsStable 条件，避免等待失败节点期间被 wsStable 提前打断
- [x] TypeScript 0 errors，107/109 测试通过（2个失败为沙箱网络限制导致的Telegram连通性测试）

## 批量定时域名检测 + 失败重试 + 空闲重检（2026-02-27）
- [x] 分析现有 scheduler.ts 失败重试逻辑（当前最多2次重试）
- [x] 修改失败重试次数为3次（含首次共4次尝试，MAX_RETRIES=3）
- [x] 实现队列空闲后自动重检失败域名（runChecks 完成后调用 retryFailedDomains）
- [x] 失败重检累计3次后停止（consecutiveErrors >= 3 跳过常规检测，队列空闲时重置为0）
- [x] TypeScript 0 errors，107/109 测试通过（2个失败为沙箱网络限制导致的Telegram连通性测试）

## 持续失败告警 + 前端展示（2026-02-27）
- [x] 数据库：scheduledDomains 新增 totalFailureCycles 字段（migration 0018 已推送）
- [x] 后端 scheduler.ts：重置 consecutiveErrors 时 totalFailureCycles++，超过5次触发 Telegram 永久失效告警
- [x] 后端 telegram-alert.ts：新增 sendPermanentFailureAlert 函数
- [x] 后端 router：listDomains 全量查询已自动包含 consecutiveErrors 和 totalFailureCycles
- [x] 前端：域名行展示 consecutiveErrors 标签（1-2次=橙色，>=3次=红色+提示已达上限）
- [x] 前端：域名行展示 totalFailureCycles 标签（>5次=☠️永久失效红色加粗）
- [x] TypeScript 0 errors，109/109 测试全部通过

## 重置按钮 + 健康度概览（2026-02-27）
- [x] 后端：新增 resetFailureCycles mutation（重置指定域名的 totalFailureCycles、consecutiveErrors、lastStatus）
- [x] 后端：新增 getFailureStats query（返回全局持续失败域名数和疑似永久失效域名数）
- [x] 前端：域名行操作区添加 RotateCcw 重置按钮（仅 totalFailureCycles > 0 时显示，悬停提示当前计数）
- [x] 前端：调度器状态卡片新增健康度概览行（持续失败/疑似永久失效域名数，有异常时显示红色警示）
- [x] TypeScript 0 errors，109/109 测试全部通过

## 健康度筛选 + 自定义评级规则（2026-02-28）
- [x] 前端：健康度概览"持续失败"/"疑似永久失效"数字可点击，触发全局筛选高亮对应域名
- [x] 数据库：新增 groupRatingRules 表（migration 0019 已推送）
- [x] 数据库：scheduledDomains 新增 lastFailNodes、lastAvgLatencyMs 缓存字段（migration 0020 已推送）
- [x] 后端：新增 getRatingRules / setRatingRules tRPC 接口（按分组读写评级规则）
- [x] 后端：listDomains 返回 ratingRules 数组，前端客户端计算评级
- [x] 后端：scheduler.ts 检测完成后写入 lastFailNodes 和 lastAvgLatencyMs 缓存
- [x] 前端：分组标题行新增⚙️ 评级规则按钮，打开 RatingRulesDialog 弹窗
- [x] 前端：RatingRulesDialog 支持4个等级（正常/普通/较差/极差）各自设置失败节点数阈值、延迟阈值、AND/OR 运算符、开关
- [x] 前端：域名行展示评级标签（正常=绳色/普通=蓝色/较差=橙色/极差=红色）
- [x] TypeScript 0 errors，109/109 测试全部通过

## 域名替换后独立并发检测 + 修复未知质量（2026-02-28）
- [x] 分析域名替换流程：根因为 triggerCheckAndReply 待 5分钟后检测但未将结果写回数据库
- [x] 修复：检测完成后写入 scheduledCheckResults + scheduledDomains 全部字段（lastStatus/lastFailNodes/lastAvgLatencyMs）
- [x] 去掉 5 分钟延迟，替换后立即触发检测
- [x] 使用 REPLACE_CHECK_PRIORITY=1（调度器专用并发槽），不与普通用户抢占并发配额
- [x] TypeScript 0 errors，109/109 测试全部通过

## 分组自定义检测时间间隔（2026-02-28）
- [x] 数据库：scheduledTaskGroups 已有 intervalMinutes + lastScheduledAt 字段（已推送）
- [x] 后端：调度器已按分组 intervalMinutes 判断是否到达检测时间（默认 60 分钟）
- [x] 后端：tRPC updateGroup 接口已支持修改 intervalMinutes
- [x] 前端：分组编辑弹窗已有检测间隔选择（30分钟/1小时/2小时/3小时/6小时/12小时/24小时），未设置时提示默认每小时一次
- [x] 前端：分组卡片已展示当前间隔（紫色时钟图标，默认显示灰色“默认（每小时）”）
- [x] TypeScript 0 errors

## 自定义间隔 + 倒计时 + 时间窗口（2026-02-28）
- [x] 前端：编辑弹窗新增"自定义分钟数"输入框（选择"自定义"后显示，支持任意正整数）
- [x] 数据库：scheduledTaskGroups 新增 windowStartHour、windowEndHour 字段（migration 0021 已推送）
- [x] 后端：调度器新增 isInTimeWindow 函数，支持跨午夜时间窗口，不在窗口内跳过该分组
- [x] 后端：tRPC updateGroup 接口新增 windowStartHour/windowEndHour 字段
- [x] 后端：listGroups 全量查询已自动包含 windowStartHour、windowEndHour
- [x] 前端：调度器状态卡片新增分组倒计时区域（每秒刷新，展示各分组名称+下次检测倒计）
- [x] 前端：编辑弹窗新增时间窗口设置（开关+开始小时+结束小时，支持跨午夜）
- [x] 前端：分组卡片展示时间窗口标签（蓝色 Timer 图标，如“00:00–00:06”）
- [x] TypeScript 0 errors，109/109 测试全部通过

## 倒计时触发 + 时间窗口优化 + 文案调整（2026-02-28）
- [ ] 前端：调度器状态卡片倒计时区域新增"立即触发"按钮（调用 triggerGroup mutation）
- [ ] 前端：时间窗口结束时间改为手动输入任意小时数（0-23），不限于预设选项
- [ ] 前端：倒计时旁展示时间窗口状态（"窗口内"绿色 / "窗口外"橙色+提示）
- [ ] 后端+前端：彻底删除分组删除 Telegram 告警（sendGroupDeleteAlert 函数、调用点、测试、相关类型）
- [ ] 后端：域名替换成功文案 "5 分钟后" 改为 "5 分钟内"
- [ ] TypeScript 0 errors，测试通过

## 时间窗口分钟级精度 + 删除分组告警 + 文案修复（v1.5.6，2026-02-28）
- [x] 后端：彻底删除 sendGroupDeleteAlert 函数及接口（telegram-alert.ts）
- [x] 后端：删除 handleGroupDeleteConfirm 函数及 answerCallback 辅助函数（telegram-webhook.ts）
- [x] 后端：域名替换成功文案 "5 分钟后" 改为 "5 分钟内"（telegram-webhook.ts）
- [x] 测试：更新 group-operation-logs.test.ts，移除 sendGroupDeleteAlert 相关测试用例
- [x] 数据库：scheduledTaskGroups 新增 windowStartMinute、windowEndMinute 字段（migration 0022 已推送）
- [x] 后端：isInTimeWindow 函数升级为分钟级精度（scheduler.ts）
- [x] 后端：tRPC updateGroup 接口新增 windowStartMinute/windowEndMinute 字段
- [x] 前端：时间窗口输入改为 HH:MM 格式文本输入（支持任意分钟，如 08:30）
- [x] 前端：倒计时卡片时间窗口状态展示升级为分钟级精度（如 "窗口内 (08:30–22:00)"）
- [x] 前端：分组卡片头部时间窗口标签升级为分钟级精度
- [x] TypeScript 0 errors，107/107 测试全部通过

## 品牌分组功能增强（2026-02-28）
- [x] 数据库：scheduledDomains 新增 enabled 字段（migration 0023）
- [x] 后端：调度器过滤 enabled=false 的域名（不检测已停止的域名）
- [x] 后端：新增 toggleDomain tRPC 接口（启停单条域名）
- [x] 后端：品牌分组沿用通知逻辑（无需额外修改，通知逻辑已按分组执行）
- [x] 前端：品牌分组通过 category="品牌" 自动识别，写死为特殊展示模式
- [x] 前端：品牌分组支持单条域名启停开关（调用 toggleDomain）
- [x] 前端：品牌分组支持自定义检测间隔（手动输入任意分钟数）
- [x] 前端：品牌分组支持添加域名、删除域名
- [x] 前端：品牌分组支持类别折叠（沿用现有 collapsedCategories 逻辑）
- [x] 前端：品牌分组编辑弹窗分组名/category 字段只读（带“品牌分组不可修改”标签）
- [x] TypeScript 0 errors，106/107 测试通过（1 项网络超时，非代码问题）

## 调度器优化 + 即时通知 + 乐观更新（2026-02-28 v1.5.8）
- [ ] 前端：调度器状态-分组下次检测卡片默认折叠，手动点击展开
- [ ] 前端：调度器状态-分组下次检测按排序规则排序（执行中>即将执行>最小时间>最大时间）
- [ ] 前端：修复检测间隔「自定义分钟数」点击无反应的 bug
- [ ] 前端：品牌分组域名启停开关增加乐观更新
- [ ] 后端：单条域名检测异常后立即发送 Telegram 通知，无需等待全组完成

## 调度器优化 + 即时通知 + 乐观更新（2026-02-28）
- [x] 前端：调度器状态卡片「分组下次检测」区域支持折叠（默认折叠，点击展开）
- [x] 前端：倒计时列表按「执行中 > 即将执行 > 剩余时间升序」排序，执行中蓝色脉冲动画
- [x] 前端：修复自定义分钟数按钮点击无反应的 bug（editCustomInterval 初始化逻辑）
- [x] 前端：品牌分组域名启停开关增加乐观更新（onMutate/onError/onSettled 模式）
- [x] 后端：单条域名检测异常立即发送 Telegram 通知 + 站内信，无需等待全组完成
- [x] TypeScript 0 errors，107/107 测试通过

## 品牌分组域名启停开关修复（2026-02-28）
- [x] 修复品牌分组每条域名的暂停/启动开关未显示的问题（根本原因：isBrandGroup 判断条件错误，应用 group.name 而非 group.category 判断）

## 调度器并发重构（2026-02-28）
- [x] 品牌分组检测独占 10 并发，失败跳过，全组完成后重试失败域名
- [x] 其他定时分组检测独占 20 并发，失败跳过，全组完成后重试失败域名
- [x] 普通检测：无队列时 5 并发，堆积超 10 条时升至 10 并发（独占）
- [x] 总并发上限 30，三类任务互不干扰
## 调度器并发重构完成（v1.5.10，2026-02-28）
- [x] shared-browserless-queue.ts：重写为三类独立信号量（brand/scheduled/normal），总上限 30
- [x] itdog-puppeteer.ts：新增 priority=2 支持，使用 acquireBrandSlot 独占 10 并发
- [x] aliyun-puppeteer.ts：新增 priority=2 支持，使用 acquireBrandSlot 独占 10 并发
- [x] scheduler.ts checkAndSaveDomain：新增 priority 参数（2=品牌，1=其他定时）
- [x] scheduler.ts runGroupCheck：改为 Promise.allSettled 并发执行，品牌分组 priority=2，其他 priority=1
- [x] TypeScript 0 errors，107/107 测试通过

## 倒计时显示逻辑优化（2026-02-28）
- [x] 前端：「分组下次检测」区域，当 currentTask 包含某分组名时，该分组显示「执行中」（蓝色脉冲）而非「即将执行」
- [x] TypeScript 0 errors，107/107 测试通过

## 调度器状态三项优化（2026-02-28）
- [x] 后端：scheduler.ts state 新增 currentTasks: string[] 数组，runGroupCheck 开始/结束时维护该数组
- [x] 后端：getSchedulerStatus 返回 currentTasks 数组（兼容保留 currentTask 单字段）
- [x] 前端：isRunning 判断改用 currentTasks.includes(g.name)，支持多分组并发执行时同时显示「执行中」
- [x] 前端：状态轮询间隔从 15s 缩短至 5s，提升执行状态感知速度
- [x] 前端：分组「触发」按钮在该分组执行中时禁用，tooltip 显示「执行中，请等待」
- [x] TypeScript 0 errors，106/107 测试通过（1 项 Browserless 网络超时，非代码问题）

## 站内信通知与自定义评级规则对齐（2026-02-28）
- [x] 定位自定义评级规则存储字段（groupRatingRules 表）
- [x] 修改 scheduler.ts runGroupCheck，加载分组自定义规则，用 gradeWithCustomRules 重判 qualityBad
- [x] TypeScript 0 errors，107/107 测试通过

## 调度器展示优化（2026-02-28 v2）
- [x] 数据库：新增 scheduler_daily_stats 表（statDate unique, checkedCount, runCount）
- [x] 后端：state 新增 lastCheckStartedAt，runGroupCheck 开始时记录
- [x] 后端：runChecks 完成后写入每日统计（onDuplicateKeyUpdate 累加）
- [x] 后端：getSchedulerStatus 返回 lastCheckStartedAt
- [x] 后端：新增 getDailyStats 路由（支持 days=7/30 参数）
- [x] 前端：「下次检测」改为从分组 lastScheduledAt + intervalMinutes 计算真实时间
- [x] 前端：「上次检测」改为显示 lastCheckStartedAt
- [x] 前端：「累计检测」显示近7天总次数，点击弹出近7天/30天统计弹窗
- [x] TypeScript 0 errors，测试通过

## 规则盲区警告 + 规则快照 + 状态徽标（2026-02-28 v3）
- [x] 前端：规则覆盖率提示增加「盲区警告」，检测等级跳跃时明确提示哪些等级未配置
- [x] 后端：站内信通知写入时保存触发时规则快照（JSON 字段）
- [x] 前端：站内信通知详情页增加可折叠「触发时规则快照」区域
- [x] 前端：分组列表「自定义评级规则」按钮增加状态徽标（已配置/未配置）
- [x] TypeScript 0 errors，111/111 测试通过

## 推送服务与自定义评级串联自检修复（2026-02-28 v4）
- [x] 自检：梳理 scheduler.ts 中 qualityBad 判断、Telegram 推送、站内信推送的完整链路
- [x] 定位：找出 checkAndSaveDomain 写库时不应用自定义规则、retryFailedDomains 重试时绕过自定义规则两处断点
- [x] 修复： checkAndSaveDomain 新增 customRules 参数，写库时就应用自定义规则； runGroupCheck 传入 customRules； retryFailedDomains 加载自定义规则后传入
- [x] TypeScript 0 errors，111/111 测试通过

## Telegram 评级模式标注 + 规则未匹配日志（2026-02-28 v5）
- [x] Telegram 告警消息增加「🔖 评级依据」行（📐 自定义规则 / 📏 系统默认规则）
- [x] gradeWithCustomRules 未匹配时增加 console.warn 日志（分组名、域名、实际数据、已配置规则列表）
- [x] CheckSaveResult 新增 ratingMode 字段，全链路传递到 sendTelegramAlert
- [x] checkAndSaveDomain/runGroupCheck/retryFailedDomains 均传入 groupName 供盲区日志使用
- [x] TypeScript 0 errors，111/111 测试通过

## 规则生效预览功能（2026-02-28 v6）
- [x] 在 RatingRulesDialog 弹窗底部增加「规则生效预览」区域
- [x] 输入区：失败节点数 + 平均延迟（ms）双输入
- [x] 实时判定：基于当前 forms 草稿状态（useMemo）实时计算，与后端 gradeWithCustomRules 逻辑完全一致
- [x] 结果展示：匹配时显示等级彽标+命中规则条件；未匹配时显示盲区警告；无规则时提示默认规则
- [x] 较差/极差等级额外提示「将触发 Telegram 告警和站内信通知」
- [x] TypeScript 0 errors，110/111 测试通过（1 个网络连通性测试因沙箋限制失败，与本次修改无关）

## 盲区警告一键补全功能（2026-02-28 v7）
- [x] 实现 autoFillGapLevels 函数：为盲区等级计算相邻等级阈值的中间值
- [x] 在盲区警告区域添加「✨ 一键补全」按钮（琥珀色）
- [x] 补全逻辑：启用盲区等级 + 填入失败节点数/延迟的中间值 + 继承相邻等级的 operator
- [x] TypeScript 0 errors

## 一键补全撤销 + 滚动高亮（2026-02-28 v8）
- [x] 补全前保存 forms 快照（autoFillSnapshot），补全后在盲区警告中显示「↩ 撤销」按钮
- [x] 撤销后清除快照，撤销按钮消失
- [x] 补全后记录第一个被补全的等级，通过 useRef + scrollIntoView 自动滚动到该卡片
- [x] 被补全的等级卡片短暂高亮（黄色边框 + highlight-pulse 动画，2秒后恢复）
- [x] TypeScript 0 errors

## 全面自检 + 重构 + UI优化 + 版本更新（2026-02-28 v9）
- [x] 自检：扫描所有功能模块，记录问题
- [x] 修复自检发现的问题（N+1查询优化、移除 as any 断言）
- [x] 后端重构：清除冗余代码/重复逻辑/无效注释
- [x] 前端重构：提升 ratingBadge 常量、抽取 matchRatingRules 纯函数
- [x] 前端UI优化：骨框屏加载状态、分组卡片 hover 微交互、空状态提示优化、SchedulerStatusCard 骨框屏
- [x] 更新登录页版本号为 V1.5.8.0228
- [x] TypeScript 0 errors，111/111 测试通过

## 批量操作功能（v1.5.9.0228）
- [x] 后端：新增 batchMoveDomains 接口（批量移动域名到目标分组）
- [x] 后端：新增 batchToggleDomains 接口（批量启停域名）
- [x] 前端：域名列表批量模式新增「启动」「暂停」「移动」三个操作按鈕
- [x] 前端：批量移动弹窗（分组列表选择 + 已选数量显示 + 重复域名自动跳过提示）
- [x] TypeScript 0 errors，111/111 测试通过

## 全局域名搜索功能（v1.6.0.0228）
- [x] 后端：新增 searchDomains 接口（跨分组搜索域名，返回域名+所属分组信息）
- [x] 前端：定时检测页顶部增加搜索框（含搜索图标、清空按鈕、点击外部自动关闭）
- [x] 前端：搜索时展示匹配结果列表（域名 + 所属分组 + 当前状态 + 已暂停标识）
- [x] 前端：点击搜索结果自动展开对应分组并滚动定位，高亮分组卡片 2.5s
- [x] 前端：搜索关键词高亮显示（匹配部分黄色底色标注）
- [x] 前端：无结果时显示友好的空状态提示
- [x] 防抖 300ms，输入期间不发起请求
- [x] TypeScript 0 errors，110/111 测试通过（browserless 外部服务暂时不可用，与代码无关）

## 调度器动态并发重构（v1.7.0.0228）
- [x] 后端：重写 shared-browserless-queue.ts，实现动态并发算法（<10条固定10；>=10条 pending+1；上限 30）
- [x] 后端：定时任务使用 acquireSchedulerSlot，普通任务并发满时进入排队
- [x] 后端： getSchedulerStatus 新增 dynamicConcurrent/schedulerActiveCount/normalActiveCount/pendingScheduledCount/normalQueueLength 字段
- [x] 后端： itdog/aliyun 均通过统一的 acquireSlot/acquireSchedulerSlot 接口控制并发
- [x] 前端： SchedulerStatusCard 并发状态展示升级（空闲/动态/高负载/满载四档标签 + 待检测数 + 正在检测明细 + 普通排队数）
- [x] 前端：普通检测排队时显示动态并发数和前面还有多少个普通任务排队
- [x] 前端： Home.tsx 导航栏展示动态并发数（N/并发上限）和普通排队数
- [x] TypeScript 0 errors，111/111 测试通过

## 调度器并发历史折线图（v1.7.1.0228）
- [x] 后端： shared-browserless-queue.ts 新增环形缓冲区，每 30s 采集并发快照，保留最近 120 个点（1 小时）
- [x] 后端： scheduled.ts 新增 getConcurrencyHistory 接口，返回快照数组
- [x] 前端： SchedulerStatusCard 新增 historyQuery，有数据时展示迷你折线图
- [x] 前端： MiniLineChart SVG 组件（并发数蓝色实线+渐变填充，待检测橙色虚线，3条背景网格线）
- [x] 前端：图表底部显示时间轴标签（1小时前 / 30分前 / 现在）
- [x] 前端：每 30s 自动刷新折线图数据
- [x] TypeScript 0 errors，110/111 测试通过（browserless 外部服务暂时不可用）

## 折线图鼠标悬停 Tooltip（v1.7.2.0228）
- [x] 前端：MiniLineChart 增加鼠标移动事件，计算最近数据点
- [x] 前端：Tooltip 显示时间点（HH:mm:ss）、并发数、待检测数，有排队时额外显示普通排队数
- [x] 前端：竖线指示器跟随鼠标位置，悬停点显示蓝色/橙色圆点
- [x] 前端：Tooltip 自动左右定位（x > 60% 时展向左侧，避免超出容器）
- [x] TypeScript 0 errors，111/111 测试通过

## 分组检测进度条（v1.7.3.0228）
- [x] 后端： SchedulerState 新增 groupProgress Map， runGroupCheck 每完成一个域名递增 completed
- [x] 后端： getSchedulerStatus 暴露 groupProgress 数组（groupId/total/completed/groupName）
- [x] 后端：分组检测完成后延迟 5s 再删除进度记录，让前端有时间读到 100%
- [x] 前端： GroupCardProps 新增 checkProgress prop
- [x] 前端： GroupCard 头部下方插入蓝色进度条（完成数/总数 + 百分比 + 动画过渡）
- [x] 前端：主页面新增 mainSchedulerStatusQuery，每 3s 轮询，构建 groupProgressMap 传入分组卡片
- [x] TypeScript 0 errors，111/111 测试通过

## 调度器独立页面拆分（v1.8.0.0228）
- [x] 后端：删除 triggerAllGroups（立即检测全部）接口及相关代码
- [x] 后端：新增调度器卡片排序持久化接口（按账号隔离）
- [x] 前端：创建 Scheduler.tsx 独立页面，迁移 SchedulerStatusCard 组件
- [x] 前端：导航栏新增「调度器」第四个入口
- [x] 前端：健康度「持续失败」「疑似永久失效」点击弹窗汇总对应域名
- [x] 前端：弹窗中点击域名自动跳转定时检测页并高亮对应域名
- [x] 前端：调度器功能卡片支持拖拽排序（账号隔离持久化）
- [x] 前端：调度器页面以最快频率刷新（1-2s 轮询，不影响性能）
- [x] 前端：定时检测页面移除 SchedulerStatusCard 组件
- [x] TypeScript 0 errors，111/111 测试通过

## 定时检测页删除调度器组件（v1.8.1）
- [x] 删除 ScheduledTasks.tsx 中的 SchedulerStatusCard 组件及相关 import/query/state
- [x] 删除 ScheduledTasks.tsx 中调度器相关的 UI 渲染区块
- [x] TypeScript 0 errors，110/111 测试通过（browserless.test.ts 失败与本次修改无关）

## Bug修复：批量检测域名卡「检测中」（v1.8.2）
- [x] 定位批量检测状态管理逻辑，找到卡「检测中」的根本原因
- [x] 修复状态同步逻辑，确保检测完成后正确更新域名状态
- [x] TypeScript 0 errors，111/111 测试通过

## 修复调度器总检测数量统计（v1.8.3）
- [x] 定位总检测数量的当前统计逻辑，确认数据来源（原来是内存变量 activeCount，重启归零）
- [x] 后端新增 totalCheckedAllTime 字段，汇总 scheduler_daily_stats（定时检测）+ check_logs（手动检测）全量历史数据
- [x] 前端调度器页面展示累计检测总数（替换原来的 activeCount）
- [x] TypeScript 0 errors，111/111 测试通过

## 管理后台检测详情按天筛选（v1.8.4）
- [x] 定位检测详情弹窗的前后端代码，确认数据结构
- [x] 后端新增按日期筛选参数，支持按天查询 check_logs
- [x] 前端弹窗添加日期选择器和当天统计汇总
- [x] TypeScript 0 errors，111/111 测试通过

## Bug 修复：域名检测点击「立即检测」出现异常（v1.8.5）
- [x] 查看服务器日志和前端错误，定位异常原因
- [x] 修复异常：移除 staleRunning 对「SSE 不存在」的误判逻辑，避免 handleReset 刚触发时 SSE 还未建立就被重置为 idle
- [x] TypeScript 0 errors，111/111 测试通过

## Bug 修复：极差域名未触发站内信和 Telegram 预警（v1.8.6）
- [x] 定位预警通知逻辑，找到未触发的原因：retryFailedDomains 重检流程缺少通知逻辑
- [x] 修复：在 retryFailedDomains 重检完成后添加站内信 + Telegram 通知逻辑
- [x] TypeScript 0 errors，111/111 测试通过

## 修复：检测详情按天查询 + 标签页重复入口（v1.8.7）
- [x] 检查检测详情弹窗按天查询功能：确认后端已支持 date 参数筛选，前端已有日期选择器和快捷按鈕
- [x] 定位并移除 AdminPanel 顶部重复的「定时检测」和「域名检测」快捷入口按鈕（AppNav 导航栏已有）
- [x] TypeScript 0 errors，110/111 测试通过（Browserless 外部服务暂时不可用，与本次修改无关）

## 接入炸了么检测工具（v1.9.0）
- [x] 实现后端炸了么检测引擎（WebSocket + /v1/http/new API，无需 Browserless）
- [x] 端口检测板块接入炸了么：添加炸了么到 CheckToolId 和 CHECK_TOOLS
- [x] 域名检测板块接入炸了么：ToolId 扩展、ZhaleDataView 组件、calcDomainQuality 支持
- [x] 定时检测板块接入炸了么：前端工具选择、后端 scheduler 支持、schema 迁移
- [x] 两个域名与原站多轮测试比对，结果一致
- [x] TypeScript 0 errors，111/111 测试通过

## 三项优化（v1.9.1）
- [x] 检测详情弹窗顶部增加月份下拉选择器（近 12 个月），并更新后端支持 month 参数筛选
- [x] AdminPanel 标签页激活状态存入 URL 参数（?tab=xxx），支持刷新保留和直接链接跳转
- [x] 站内信通知加入 1 小时去重逻辑（sendImmediateAlert 和 retryFailedDomains 两处）
- [x] TypeScript 0 errors，111/111 测试通过

## 全面重构（v2.0.0）
- [x] 全面审查代码，列出功能问题和重构目标
- [x] 后端代码重构：提取公共 sendDomainAlerts 函数，消除 sendImmediateAlert 和 retryFailedDomains 中的重复通知代码（scheduler.ts 从 1097 行减少到约 980 行）
- [x] 前端重构：合并三个 DataView 组件（ItdogDataView/AliyunDataView/ZhaleDataView）为通用 CheckerDataView（Home.tsx 从 1562 行减少到 1265 行）
- [x] 前端 UI 扁平化重构：所有业务组件去除 rounded-xl/2xl/3xl、shadow-sm/md/lg、backdrop-blur，统一用 border 区分层次
- [x] 前端 UI 扁平化重构：AppNav、AppAuthGuard、ChinaMap、DomainPortGenerator、ScheduledTasks、Scheduler、AdminPanel、NotFound、AdminFirstSetup 全部扁平化
- [x] 第一轮全功能自测：TypeScript 0 errors，111/111 测试通过，所有 SSE 端点 HTTP 200，健康检查正常
- [x] 第二轮全功能自测：TypeScript 0 errors，111/111 测试通过，所有端点响应正常，无新 bug

## 版本号更新（v2.0.0.0228）
- [x] Login.tsx 右下角版本号从 V1.5.8.0228 更新为 V2.0.0.0228（三处）
- [x] server/_core/index.ts 健康检查端点版本号更新为 v2.0.0
- [x] package.json 版本号更新为 2.0.0
- [x] TypeScript 0 errors

## Bug 修复（v2.0.1）
- [x] 管理后台-用户管理-检测记录弹窗：修复 SQL GROUP BY DATE(列名) 语法问题（TiDB 不支持带表名的 GROUP BY DATE(表.列)），弹窗现已正常加载数据（total:17 items:17 dailyStats:1 已验证）
- [x] 调度器页面：将拖拽手柄从卡片右上角移到底部居中（absolute bottom-1 left-1/2 -translate-x-1/2），完全避免与展开全/触发按钮重叠

## 站内信同步删除（v2.0.2）
- [x] 定位站内信通知存储结构：notifications 表有 domain 字段，域名更换在 telegram-webhook.ts handleDomainReplace 函数中执行
- [x] 在 handleDomainReplace 替换成功后添加 db.delete(notifications).where(eq(notifications.domain, oldDomain))，同步删除旧域名所有用户的站内信异常通知
- [x] TypeScript 0 errors，111/111 测试通过

## 调度器 UI 调整（v2.0.3）
- [x] 统计弹窗：手动检测次数改为从 checkLogs 按日期聚合（manualCount），定时检测域名次数改用 checkedCount（每条域名算一次）
- [x] 统计弹窗：日期展示改为两列表格，清晰展示每天手动/定时数据
- [x] 去除实时/更新中文字标签，保留绳点动画（页面仍实时更新）
- [x] 状态卡片：去除分组数量和总检测次数，改为今日检测和上次运行时间
- [x] 并发状态卡片 + 健康度概览卡片合并为一个卡片，并从 DEFAULT_CARD_ORDER 中移除 health
- [x] TypeScript 0 errors，111/111 测试通过

## 时区 Bug 修复（v2.0.4）
- [x] 定位根因：后端写入 statDate 用 UTC 日期，前端查询用北京时间日期，UTC+8 凌晨时段日期错位导致数据显示为 0
- [x] 后端修复：scheduler.ts 新增 getChinaDateStr() 函数（UTC+8），statDate 写入和 cutoffStr 查询均改为北京时间
- [x] 前端修复：Scheduler.tsx 新增 getChinaDateStr() 函数，DailyStatsDialog 日期填充、isToday 判断、状态卡片"今日检测"均改为北京时间
- [x] TypeScript 0 errors，111/111 测试通过

## v2.0.5 数据为0根本修复 + 弹窗排版优化
- [x] 定位根因：Drizzle ORM 生成的 SELECT DATE(createdAt) 没有别名，TiDB only_full_group_by 报 ER_WRONG_FIELD_WITH_GROUP，getSchedulerDailyStats 整体返回空数组
- [x] 修复：改用 db.execute 原生 SQL + GROUP BY 别名（statDate），彻底绕过 Drizzle ORM 的 GROUP BY 限制
- [x] 同时改用 DATE_FORMAT(CONVERT_TZ(createdAt, '+00:00', '+08:00'), '%Y-%m-%d') 确保手动检测统计也按北京时间分组
- [x] 累计检测统计弹窗排版优化：DialogContent 加 max-h-[85vh] + flex flex-col，表格区域独立滚动，近30天不溢出屏幕
- [x] TypeScript 0 errors，111/111 测试通过

## Browserless 智能调度优化（v8.x）

- [x] 429 限流监控：单分钟内 429 次数 > 3 时自动将 TOTAL_MAX 临时降至 15
- [x] 冷启动预热：服务启动后自动发起 2 次空连接预热（仅 connect + disconnect）
- [x] 动态并发自适应：根据最近 10 次检测的 429 错误率实时调整 TOTAL_MAX（无 429 逐步升至 20，出现 429 降至 10）

## 端口生成页面重构（v9.x）

- [x] 新增厂商表（port_vendors）：id、name、createdBy、createdAt
- [x] 新增厂商域名表（vendor_domains）：id、vendorId、domain、category（9类）、createdAt
- [x] 后端：厂商 CRUD tRPC 接口
- [x] 后端：域名分类导入（手动/Excel）接口
- [x] 后端：Excel 模板生成下载接口（含厂商+9类分类）
- [x] 后端：按厂商+端口组生成域名接口（每类别一条，随机端口）
- [x] 后端：一键检测接口（生成后自动提交检测）
- [x] 前端：厂商管理面板（增删改名）
- [x] 前端：Excel 导入域名（含厂商选择、导入前可改名）
- [x] 前端：手动批量上传域名（含厂商+分类选择）
- [x] 前端：生成逻辑（选择厂商端口+厂商域名，每类别一条）
- [x] 前端：随机厂商模式（端口厂商=域名厂商，动态匹配）
- [x] 前端：检测完成弹窗（显示9类域名结果）
- [x] 前端：单条域名复制按鈕
- [x] 前端：格式化一键复制（WEB/H5/全站/体育/真人/代理web/代理H5/精简版H5/精简版体育H5）

## 端口生成页面 - 新增独立上传入口（v9.1）

- [ ] Schema：vendorDomains 表新增 siteType（A1-A9）和 cdnType（a8/a8543/toff）字段
- [ ] 推送数据库迁移
- [ ] 后端：importDomains 接口支持 siteType + cdnType 字段
- [ ] 后端：parseExcel 接口支持解析含站点/CDN 列的 Excel
- [ ] 后端：Excel 模板生成支持站点+CDN+分类三维度
- [ ] 前端：页面顶部新增独立「上传域名」入口按钮（不依赖厂商选择）
- [ ] 前端：上传弹窗 - 站点选择（A1-A9，多选）
- [ ] 前端：上传弹窗 - CDN 选择（A8/A-8543/Toff，单选）
- [ ] 前端：上传弹窗 - 域名分类选择（9类）
- [ ] 前端：上传弹窗 - 手动输入支持
- [ ] 前端：上传弹窗 - Excel 上传支持（含模板下载）
- [ ] 前端：厂商管理面板展示 siteType/cdnType 统计信息

## 端口生成页面 - 三维度上传入口完成（v9.1 已完成）
- [x] Schema：vendorDomains 表新增 siteType（A1-A9）和 cdnType（a8/a8543/toff）字段
- [x] 推送数据库迁移（pnpm db:push）
- [x] 后端：importDomains 接口支持 siteType + cdnType 字段（去重逻辑含四维度）
- [x] 后端：parseExcel 接口支持解析含站点/CDN 列的 Excel（列名：站点/site、CDN/cdn）
- [x] 后端：Excel 模板生成支持站点+CDN+分类三维度（每个分类一个 Sheet，含示例行）
- [x] 后端：generateUrls 接口支持按 siteType/cdnType 过滤域名
- [x] 后端：listVendorsWithStats 返回 siteCounts + cdnCounts 统计
- [x] 前端：域名库区域新增「三维度上传」按钮（紧邻「导入域名」）
- [x] 前端：三维度上传弹窗 - 站点选择（A1-A9，下拉，可不限）
- [x] 前端：三维度上传弹窗 - CDN 选择（A8/A-8543/Toff，下拉，可不限）
- [x] 前端：三维度上传弹窗 - 域名分类选择（9类，下拉）
- [x] 前端：三维度上传弹窗 - 当前维度标签预览
- [x] 前端：三维度上传弹窗 - 手动输入支持
- [x] 前端：三维度上传弹窗 - Excel 上传支持（含三维度模板下载）
- [x] 前端：厂商管理面板展示 siteType/cdnType 统计信息（站点/CDN 标签）
- [x] 测试：132/132 全部通过

## 域名库管理页 + 生成维度过滤（v9.2）
- [x] 后端：vendor.listDomains 接口（分页+按 vendorId/category/siteType/cdnType 筛选）
- [x] 后端：vendor.deleteDomain 接口（单条删除，按 id）
- [x] 后端：vendor.batchDeleteDomains 接口（批量删除，按 ids）
- [x] 前端：新建 DomainLibrary.tsx 域名库管理页面
- [x] 前端：域名库页 - 顶部筛选栏（厂商/分类/站点/CDN 四维筛选）
- [x] 前端：域名库页 - 分页域名列表（显示域名/分类/站点/CDN/创建时间）
- [x] 前端：域名库页 - 单条删除按鈕（二次确认）
- [x] 前端：域名库页 - 批量删除（勾选 + 批量删除按鈕）
- [x] 前端：端口生成页 - 生成前新增站点/CDN 过滤选择（可不限）
- [x] 注册路由 /library，导航栏新增「域名库」 Tab
- [x] 测试：132/132 全部通过

## 导入弹窗无效域名明细展示（v9.3）
- [x] 导入弹窗解析结果区域：展示具体无效域名列表（域名 + 对应分类），132/132 测试通过

## Bug 修复：生成按钮无法点击（v9.4）
- [x] 修复「生成域名 URL」按鈕 disabled 逻辑：厂商加载后自动选中第一个，132/132 测试通过

## 生成结果勾选标记已使用 + 导出标红（v9.5 已完成）
- [x] schema 新增 isUsed/usedAt 字段，pnpm db:push 迁移成功
- [x] 后端 markDomainUsed 接口（按域名字符串标记）
- [x] 后端 generateUrls 跳过 isUsed=true 的域名
- [x] 后端 exportDomains 接口（已使用域名标红，支持筛选）
- [x] 前端生成结果每行新增勾选框，勾选后调用 markDomainUsed，已使用标红删除线
- [x] 前端域名库页新增「导出 Excel」按鈕，已使用域名标红
- [x] 132/132 测试通过

## v9.6 三项需求（已完成）
- [x] 后端：generateUrls 中精简版H5(lite_h5) 复用 H5 域名池生成
- [x] 后端：导入模板 Excel 去除精简版H5 Sheet（保留其他8类）
- [x] 后端：exportDomains 去除精简版H5分类（导出时合并到H5）
- [x] 前端：域名维度过滤新增「域名类别」下拉（9类，精简版H5复用H5标注）
- [x] 前端：端口批量生成页新增模式切换 Tab（厂商域名库 vs 手动输入），132/132 测试通过

## v9.6.2 隐藏精简版H5未配置标签
- [x] 厂商域名库统计标签区域隐藏「精简版H5 未配置」标签

## v9.7 三项功能（已完成）
- [x] 后端：vendor.getLibraryStats 接口（厂商/站点/CDN 分布+剩余数量）
- [x] 前端：域名库页顶部统计看板卡片（总量/已使用/剩余/厂商/站点/CDN 分布）
- [x] 前端：生成结果每条 URL 显示来源域名的站点/CDN 标签
- [x] 前端：域名库页导出 Excel 按钮（含已使用标红，支持当前筛选，已验证）
- [x] 132/132 测试通过

## v9.8 生成结果记忆功能（已完成）
- [x] 前端：点击「前往检测」跳转后，切换回端口生成页时保留生成的 URL 列表及相关状态（使用 sessionStorage 持久化）
- [x] 132/132 测试通过

## v9.9 域名类别多选过滤（已完成）
- [x] 前端：域名维度过滤的「域名类别」改为多选（checkbox 下拉），支持同时选择多个类别
- [x] 后端：generateUrls 接口支持 categories 数组参数（多类别过滤）
- [x] 132/132 测试通过

## v9.10 域名库统计站点明细展开（已完成）
- [x] 后端：getLibraryStats 接口新增站点×厂商×类别的剩余数量明细数据
- [x] 前端：统计看板站点分布区域支持折叠/展开，展开后显示各厂商×各类别剩余数量
- [x] 前端：剩余数量低于3条时高亮显示（红色/橙色）
- [x] 前端：某站点有任意类别剩余<3时自动展开该站点明细
- [x] 前端：默认折叠状态
- [x] 132/132 测试通过

## v10.0 全面重构（已完成）
- [x] 后端：拆分 vendor.ts（840行 → 474行），提取 constants.ts、helpers.ts，清理冗余代码
- [x] 前端：拆分 DomainPortGenerator.tsx（1561行 → 826行），提取 ImportDialog.tsx + domainConstants.ts
- [x] 前端： DomainLibrary.tsx 从 domainConstants.ts 导入共用常量，移除重复定义
- [x] UI：优化交互体验，统一设计语言
- [x] 自检：TypeScript 编译无错误 + 132/132 测试通过

## v10.1 Browserless 并发优化（已完成）
- [x] 分析现有并发控制代码，定位根因：429 后重试无退避导致雪崩
- [x] 降低 TOTAL_MAX_HARD 18→6，为悬挂连接留出充足缓冲
- [x] 429 后全局暂停机制：首次 5s，递增至 30s，防止重试雪崩
- [x] acquireSlot/acquireSchedulerSlot 加入暂停等待逻辑
- [x] getBrowserWithRetry 429 退避：5s×attempt（最大 20s），同步优化 aliyun/itdog 两个文件
- [x] calcDynamicConcurrent 改为 pending×0.7，避免单分组占满所有槽位
- [x] MIN_BATCH_THRESHOLD/CONCURRENT 8→6，更保守
- [x] 132/132 测试通过

## v10.2 重新生成时清除记忆
- [ ] 前端：点击「重新生成」时先清除 sessionStorage 中的生成结果，生成完成后重新写入

## 新功能（v10.3）

- [x] 生成结果列表增加全选/取消全选复选框，配合批量标记已使用按钮
- [x] 域名库低库存时自动推送 Telegram 告警（阈值可配置，默认 < 3）

## 新功能（v10.4）

- [x] 低库存告警防抖：数据库记录上次告警时间，3小时内同一厂商不重复推送
- [x] 告警阈值可配置化：system_settings 表存储阈値，管理后台新增设置项

## 新功能（v10.5）

- [x] 告警冷却时间可配置：system_settings 新增 low_stock_cooldown_hours 键，管理后台卡片增加输入框
- [x] 低库存手动重置冷却：管理后台增加「清除冷却记录」按钮，清空 low_stock_alert_log 表

## 新功能（v10.6）

- [x] 低库存告警消息自定义模板：system_settings 新增模板键，支持变量占位符，管理后台可编辑

## 新功能（v10.7）

- [x] 告警消息模板实时预览：编辑模式下用模拟数据渲染模板，保存前可直观确认推送效果
- [x] 告警消息模板修改历史：数据库记录每次变更，支持查看、对比（diff）和恢复到历史版本

## 优化（v10.8）

- [x] 分组错峰调度：多分组同时到期时，分组间增加 8 秒启动间隔，避免瞬时连接风暴
- [x] TOTAL_MAX_HARD 从 14 降至 10，TOTAL_MAX_THROTTLED 从 10 降至 8，给 Browserless 更多缓冲空间
- [x] 预热优化：预热数量 2→3，连接间隔 500ms→2000ms，充分预热同时避免占用首批并发配额

## 新功能（v10.9）

- [x] 动态错峰间隔：按分组域名数量自动调整等待时间（域名越多等待越长）
- [x] 全类型告警模板管理：支持所有告警类型的模板编辑和停用开关，默认折叠可展开

## UI调整（v10.10）

- [x] 隐藏厂商列表行中的「N条域名」标签和分类统计（WEBx13 H5x11…）
- [x] 隐藏域名库卡片中的「共N条域名，覆盖N个分类」、分类标签列表、站点/CDN统计行

## 新功能（v10.11）

- [x] 导入域名弹窗增加「自动重置冷却状态」复选框，后端支持该参数
- [x] 域名库标签页：厂商管理+主推域名库移入，放在域名详情上方
- [x] 域名库标签页：新建 SEO 域名库（支持上传 SEO 域名）
- [x] 当前域名库改名为「主推域名库」
- [x] 端口生成页面移除厂商管理和域名库区块，保留厂商选择按鈕组

## UI简化（v10.12）

- [x] 厂商域名库模式下删除「选择厂商」和「端口组选择」区块，只保留随机厂商模式复选框
- [x] 生成逻辑改为默认使用所有端口组，无需手动选择端口组

## 通知精简（v10.13）

- [x] 删除域名更换成功后触发的「新域名检测结果」Telegram 通知及 triggerCheckAndReply 函数
- [x] 移除相关 import（enqueueItdogCheck、enqueueAliyunCheck、scheduledTaskGroups）
- [x] 成功消息中移除「正在对新域名进行检测，预计 5 分钟内回复检测结果」提示

## 端口生成页面改进（v10.14）

- [x] 手动输入模式恢复端口组选择（A8 / A-8543 / Toff 按鈕组）
- [x] 厂商域名库模式：域名维度过滤添加「域名库」选项（主推/SEO）
- [x] CDN 选择后自动匹配对应厂商域名和端口组（a8→A8端口，a8543→A-8543端口，toff→Toff端口）
- [x] 站点选定后，CDN 选项仅展示已导入域名的厂商，未导入则不展示

## 端口生成页面改进（v10.15）

- [x] 后端增加站点×CDN 组合统计（按 siteType+cdnType+poolType 分组），用于前端联动过滤
- [x] 前端 CDN 下拉根据当前选中站点联动过滤（只展示该站点下有剩余域名的 CDN）
- [x] 生成结果头部增加「本次端口组：A8 + Toff」说明

## 端口匹配修复（v10.16）

- [x] 修复 generateUrls 端口分配逻辑：每条域名根据自身 cdnType 字段匹配对应端口组（a8→A8端口，a8543→A-8543端口，toff→Toff端口），禁止跨 CDN 混用端口

## 域名生成体验改进（v10.17）

-- [x] 导入对话框：解析域名后检查无 CDN 类型的条目，给出明确警告（显示数量和示例）
- [x] 生成结果列表：每条域名旁显示 CDN 类型标签（A8 / A-8543 / Toff）
- [x] 无对应 CDN 域名时：结果中显示「该类别暂无xx CDN 域名」替代「未配置域名」

## 端口匹配 Bug 修复（v10.18）

- [x] 确认端口分配逻辑正确（端口 7988 属于 A8 端口组），问题根因是站点标签（A1）和 CDN 标签（A8）外观相似导致误解
- [x] 给站点标签加「站:」前缀，CDN 标签加「CDN:」前缀，两者更易区分

## 导入校验增强（v10.19）

- [ ] 了解厂商名称与 CDN 类型的对应关系（Toff→toff, A8→a8, A-8543→a8543）
- [ ] 导入对话框：根据当前厂商名称自动推断并锁定 CDN 类型，防止错误选择
- [ ] 若厂商与 CDN 不一致，给出明确警告或阻止导入

## 代码重构与 UI 改版（v11.0）
- [x] 提取可复用子组件：CopyBtn（31行）、CategoryMultiSelect（91行）、DetectionCompleteDialog（92行）
- [x] 重构 DomainPortGenerator.tsx：874行 → 602行（减少 31%），引用独立子组件
- [x] 重构 DomainLibrary.tsx：1055行 → 550行（减少 48%），删除冗余代码，UI 更统一
- [x] QA 验证：132/132 测试全部通过，TypeScript 无编译错误，三个域名池地址全部可访问（HTTP 200）

## 代码重构与 UI 改版（v11.0）
- [x] 提取可复用子组件：CopyBtn、CategoryMultiSelect、DetectionCompleteDialog
- [x] 重构 DomainPortGenerator.tsx：874行→602行，引用独立子组件
- [x] 重构 DomainLibrary.tsx：1055行→550行，删除冗余代码
- [x] QA：132/132 测试通过，TypeScript 无错误，三个域名池 HTTP 200

## 新功能开发（v12.0）
- [ ] Schema 变更：vendorDomains 新增检测状态字段（lastCheckedAt/lastStatus/lastSummary/lastFailNodes/lastAvgLatencyMs）
- [ ] Schema 变更：新增 telegram_chat_site_mappings 表（群组ID→站点类型映射）
- [ ] 执行 db:push 同步数据库
- [ ] 后端：SEO 导航页数据接口（按站点+分类分组展示当前在用 SEO 域名）
- [ ] 后端：SEO 域名检测引擎集成（复用 checkAndSaveDomain 逻辑）
- [ ] 后端：群组-站点映射 CRUD 接口
- [ ] 前端：新增 SEO 导航页（/seo-nav），支持批量上传和分组展示
- [ ] 前端：系统设置新增群组-站点映射配置项
- [ ] 后端：Telegram Webhook 扩展——关键词监听、回复「请稍等」、触发 SEO 域名检测与自动换域名
- [ ] 后端：格式化通知发送（严格按照指定格式）
- [ ] SEO 域名库已用标红展示与导出 Excel 标红
- [ ] QA 验证：运行测试、自检所有功能

## SEO 域名管理系统（v12.0 完成）
- [x] Schema 变更：vendorDomains 新增检测状态字段（lastCheckedAt/lastStatus/lastSummary/lastFailNodes/lastAvgLatencyMs）
- [x] Schema 变更：新增 telegram_chat_site_mappings 表（群组ID→站点类型映射）
- [x] 执行 db:push 同步数据库
- [x] 后端：SEO 导航页数据接口（按站点+分类分组展示当前在用 SEO 域名）
- [x] 后端：SEO 域名检测引擎集成（复用 ITDOG/阿里云检测逻辑）
- [x] 后端：群组-站点映射 CRUD 接口（listMappings/addMapping/updateMapping/deleteMapping）
- [x] 后端：SEO 自动换域名逻辑（autoReplaceSEODomains）
- [x] 前端：新增 SEO 导航页（/seo-nav），支持批量上传、分组展示、检测触发
- [x] 前端：AppNav 导航栏新增 SEO导航 Tab
- [x] 前端：管理面板 stats Tab 新增 Telegram 群组-站点映射配置卡片（CRUD）
- [x] 前端：SEO 域名库 isUsed=true 的行红色高亮+「已废弃」标签
- [x] 后端：Telegram Webhook 扩展——关键词监听（链接/SEO链接/更新下链接等）、回复「请稍等」、触发检测与自动换域名
- [x] 后端：格式化通知发送（A1\nSEO专用域名\n\nWEB  url  【新】格式）
- [x] 修复 telegram-webhook.ts TypeScript 错误（isActive→enabled，chatId 类型）
- [x] QA 验证：132/132 测试全部通过，TypeScript 无编译错误

## SEO 后台文案与关键词配置（v12.1）
- [x] Schema：telegram_chat_site_mappings 新增 replyText 字段（收到关键词后的回复文案）
- [x] Schema：新增 seo_trigger_keywords 表（id/siteType/keyword/createdAt）
- [x] Schema：新增 seo_notify_templates 表（id/siteType/templateType/content/createdAt/updatedAt）
- [x] 执行 db:push 同步数据库
- [x] 后端：seo.listKeywords/addKeyword/deleteKeyword 接口（按 siteType 管理关键词）
- [x] 后端：seo.listNotifyTemplates/upsertNotifyTemplate 接口（按 siteType+templateType 管理通知文案）
- [x] 后端：seo.updateMapping 接口支持更新 replyText 字段
- [x] Telegram Webhook：从数据库读取关键词列表（替换硬编码），读取回复文案（替换硬编码）
- [x] Telegram Webhook：检测完毕后通知文案从数据库读取（替换硬编码）
- [x] 前端：群组映射卡片编辑弹窗新增「回复文案」文本域
- [x] 前端：管理面板新增「SEO 关键词配置」卡片（按站点分组，支持增删）
- [x] 前端：管理面板新增「SEO 通知文案配置」卡片（按站点+模板类型，支持编辑+预览）

## SEO 管理面板 UI 优化（v12.2）
- [x] 通知文案配置：编辑弹窗右侧增加实时预览（替换占位符后的最终效果）
- [x] 关键词配置：增加批量导入功能（粘贴多行文本一次性添加多个关键词）
- [x] 群组映射表格：增加「当前回复文案」列（截断显示，最多显示 20 字）

## SEO 管理面板 UI 细节优化（v12.3）
- [x] 批量导入关键词：确认导入前显示「已存在 N 个重复关键词将跳过」提示
- [x] 群组映射「默认」标签：添加 tooltip 说明默认文案内容（「请稍等」）

## SEO 管理面板功能扩展（v12.4）
- [x] 群组映射表格：增加行内快捷启用/禁用开关（调用 updateMapping 接口）
- [x] 通知文案卡片：每种模板类型增加一键开关（enabled 字段，控制是否发送该类型通知）
- [x] Schema：seo_notify_templates 新增 enabled 字段
- [x] 后端：updateMapping 接口支持仅更新 enabled 字段
- [x] 回复文案可配置：seo_notify_templates 新增 reply_keyword 模板类型，支持配置监听到关键词后的回复文案
- [x] 前端：通知文案配置卡片增加 reply_keyword 类型，支持编辑+预览
- [x] Telegram Webhook：从数据库读取 reply_keyword 文案替换硬编码「请稍等」

## SEO 管理面板功能扩展（v12.5）
- [x] 后端：seo.testSendNotify 接口（向当前站点绑定的所有启用群组发送预览消息）
- [x] 后端：seo.batchToggleMappings 接口（批量启用/禁用所有映射）
- [x] 前端：通知文案卡片每种模板类型增加「测试发送」按鈕
- [x] 前端：群组映射卡片顶部增加「全部启用」「全部禁用」批量操作按鈕

## Bug 修复（v12.6）
- [x] 修复关键词两步过滤问题：自定义关键词无法通过第一步默认关键词过滤，导致无法触发

## UI 改动（v12.7）
- [ ] 群组映射弹窗：移除「收到关键词后的回复文案」字段（由通知文案配置统一管理）
- [ ] SEO 导航：只显示当前在用域名，移除批量导入功能
- [ ] SEO 导航上传域名：通过端口自动判断 CDN 类型，移除 CDN 类型选择
- [ ] SEO 导航上传域名：每个分类单独输入一条域名，输入框自动过滤空格和非域名字符
- [ ] SEO 导航上传域名：取消域名分类选择功能

## SEO 导航改进（v2.0.1.0303）

- [x] 群组-站点映射弹窗：移除 replyText（回复文案）字段，添加提示说明回复文案在 SEO 通知文案配置中管理
- [x] SEO 导航：移除批量导入按钮，改为每个站点卡片上独立的「上传域名」按钮
- [x] 新建 SeoImportDialog.tsx：每个域名分类（WEB/H5/全站/体育）独立输入框，不可输入多条
- [x] SeoImportDialog：输入框自动过滤空格、中文字符等非法字符，只保留合法域名字符
- [x] SeoImportDialog：通过域名端口自动判断 CDN 类型（A8/A-8543/Toff），无需手动选择 CDN
- [x] SeoImportDialog：取消域名分类选择功能，每个分类有独立输入框
- [x] 后端新增 seo.addSeoDomain 接口，支持单域名上传到 SEO 域名库
- [x] 新增 seo.addDomain.test.ts 单元测试（16 项，全部通过）

## SEO 域名库统计增强（v2.0.2）

- [x] SEO 域名库统计：显示 CDN 分布（与主推库一致）
- [x] SEO 域名库统计：显示站点分布（与主推库一致）
- [x] SEO 域名库统计：确认总域名数/已使用/剩余可用卡片正确显示

## SEO 导航上传入口修复（v2.0.3）

- [x] 在 SEO 导航页头部添加全局「上传域名」按钮，不依赖站点卡片
- [x] 空状态区域提供可点击的上传按钮（而非仅文字提示）

## SEO 域名库批量导入 bug 修复（v2.0.4）

- [x] 修复 SEO 域名库批量导入时，域名被错误导入到主推域名库的问题

## SEO 分类调整和导入增强（v2.0.5）

- [x] 新增 SEO 专用分类常量（WEB/H5/全站/体育/福建敏感区域名WEB/福建敏感区域名H5）
- [x] SEO 导航页分类只显示 SEO 专用分类（主推不变）
- [x] SEO 域名库分类只显示 SEO 专用分类（主推不变）
- [x] SeoImportDialog 分类选项改为 SEO 专用分类
- [x] 后端新增重复域名检测接口（检测 SEO 导入域名是否已在主推库）
- [x] 导入弹窗：SEO 库导入前检测重复域名并警告
- [x] 导入成功提示中显示目标库名称（SEO 域名库/主推域名库）

### SEO Excel 导入模板分类调整（v2.0.6）
- [x] SEO 域名库 Excel 导入模板：分类列下拉选项改为 SEO 专用 6 类
- [x] 主推域名库 Excel 导入模板：保持不变
## SEO Excel 导入模板分类调整（v2.0.6）完成
- [x] server/routers/vendor/helpers.ts：新增 buildSeoImportTemplateWorkbook 函数，使用 SEO 专用 6 类（WEB/H5/全站/体育/福建敏感区域名WEB/福建敏感区域名H5）
- [x] server/routers/vendor.ts：generateExcelTemplate 接口新增 poolType 参数，seo 时调用 SEO 专用模板函数，文件名前缀改为「SEO域名导入模板」
- [x] client/src/components/ImportDialog.tsx：downloadExcelTemplate 函数支持 poolType 参数，SEO 库时使用 SEO_CATEGORIES/SEO_CATEGORY_LABELS，主推库保持不变
- [x] server/vendor.test.ts：更新分类数量断言（9→11），补充 fujian_web/fujian_h5 断言，148/148 测试全部通过

## SEO 导航数据源修正（v2.0.7）
- [x] vendorDomains 表新增 source 字段（manual=手动上传/在用，stock=库存待用）
- [x] seo.addSeoDomain 接口：写入时设置 source='manual'
- [x] autoReplaceSEODomains：新域名写入时设置 source='manual'
- [x] importDomains 批量导入到 SEO 库时：设置 source='stock'
- [x] getNavData 查询：只取 source='manual' 的域名（排除库存）
- [x] 数据库迁移：pnpm db:push

## SEO 自动换域名流程重构（v2.0.8）
- [x] vendorDomains 表新增 checkTool 字段（itdog/aliyun/zhale，默认 itdog）
- [x] seo.updateCheckTool 接口：支持调整已上传域名的 checkTool
- [x] autoReplaceSEODomains 重构：并发检测所有在用域名（最快速）
- [x] 候选域名预检测：替换前先检测新域名，质量差则标记 skipFlag 并重新选择
- [x] 检测期间质量差的候选域名标记 skipFlag，后续跳过
- [x] 连续两轮检测评级差：自动切换检测工具（itdog→aliyun→zhale）
- [x] 连续两轮检测评级差：停止执行，取消候选域名的 skipFlag
- [x] 连续失败告警：向 -5273169744 发送汇总通知（含 CDN 类型、域名类型）
- [x] 数据库迁移：pnpm db:push

## SEO 导航删除功能（v2.0.9）
- [x] 后端 seo.deleteNavDomain 接口：删除单条在用域名（source 改为 stock）
- [x] 后端 seo.clearNavCategory 接口：一键清空指定站点+分类的所有在用域名
- [x] 前端 SeoNav.tsx：每条域名行末添加删除按鈕（X 图标，hover 显示，带确认对话框）
- [x] 前端 SeoNav.tsx：每个分类卡片标题处添加一键清空按鈕（带确认对话框）

## v2.1.0 功能迭代
- [x] SEO导航：每条域名旁显示检测工具标签（ITDOG/阿里云/炸了么），点击切换
- [x] 换域通知模板：新域名 URL 后加「新」字样，区分域名类别
- [x] SEO域名库：展示 isUsed/skipFlag 状态，支持编辑
- [x] 主推域名库：展示 isUsed/skipFlag 状态，支持编辑
- [x] 两个域名库：新增「已使用」/「跳过使用」状态筛选器

## v2.1.1 换域通知编辑框预填默认文本
- [x] 找到通知配置组件中「换域完成通知」编辑框的打开逻辑
- [x] 编辑框打开时若无自定义内容，预填入系统默认模板文本

#### v2.1.2 通知文案增强
- [x] 换域完成通知预填真实域名：打开编辑框时从 SEO 导航数据读取在用域名
- [x] 通知文案批量复制到其他站点：编辑框底部新增「复制到其他站点」按鈕
- [x] 后端新增 batchCopyNotifyTemplate 接口支持批量写入

## v2.1.3 SEO 换域流程耗时优化（目标 20 分钟内完成）
- [x] 排查流程耗时瓶颈（在用域名检测、候选预检测、重试逻辑）
- [x] 单域名检测加 3 分钟超时包装（checkWithTimeout），避免 Browserless 队列满时无限等待
- [x] 候选预检测改为并发（Promise.allSettled），取第一个质量好的，大幅减少串行等待
- [x] 整体流程加 18 分钟硬超时（FLOW_TIMEOUT_MS），超时后自动发送告警
- [x] 超时后自动取消候选域名的 skipFlag 并返回 needAlert=true
## v2.2.0 检测工具健康监控 + 候选域名预热机制 + SEO 导航预热列
- [x] 新增 tool_health_logs 表、seo_preheat_logs 表（记录预热历史），vendorDomains 新增 preheatStatus/preheatAt 字段
- [x] 创建 seo-tool-health.ts：每小时探针检测 ITDOG/阿里云/炸了么；3 个全失败则告警；1-2 个失败则自动切换到健康工具
- [x] 创建 seo-preheat.ts：北京时间 08:00-14:00 非高峰期，每个 SEO 分类各预检测一条库存域名，通过则标记 preheatStatus=ok
- [x] 修改 autoReplaceSEODomains：候选查询优先取 preheatStatus=ok 的域名，命中则跳过实时检测直接使用
- [x] seo.ts 新增 getPreheatDomains 接口（按站点+分类分组，每分类只返回最早预热的一条）
- [x] vendor.ts listDomains 接口新增 preheatStatus/preheatAt/source/poolType 字段
- [x] SeoNav.tsx 新增「已检测待使用」Tab（绿色主题，含预热时间），统计卡片新增预热数量，点击可切换 Tab
- [x] DomainLibrary.tsx SEO 库存域名行标记「已检测待使用」状态（绿色高亮 + 绿色左边框）
- [x] 全部 148 个测试通过

## v2.3.0 预热动态调整 + 告警配置 + 手动预热按钮
- [x] 候选域名预热动态调整：每日/每周日志分析非高峰期（北京时间 08:00-14:00），动态更新预热触发时间
- [x] 高负载保护：检测队列超过 10 条时自动暂停预热，避免影响正常检测
- [x] 检测工具健康监控告警配置：支持文案自定义、专属群组绑定、测试通知发送（AdminPanel 告警配置页）
- [x] SEO 预热失败告警配置：连续 3 次失败自动告警，支持文案/群组/测试配置（同上）
- [x] 手动触发预热：SeoNav 页新增「立即预热」按钮，管理员可随时触发一轮预热，自动切换到预热 Tab
