import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, bigint, boolean, json, unique } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// 解锁设备表（端口生成后解锁域名检测）
// ─────────────────────────────────────────────────────────────────────────────
export const unlockedDevices = mysqlTable("unlocked_devices", {
  id: int("id").autoincrement().primaryKey(),
  fingerprint: varchar("fingerprint", { length: 64 }).notNull(),
  ip: varchar("ip", { length: 64 }).notNull(),
  unlockedAt: timestamp("unlockedAt").defaultNow().notNull(),
});

export type UnlockedDevice = typeof unlockedDevices.$inferSelect;

// ─────────────────────────────────────────────────────────────────────────────
// 应用内用户表（独立于 Manus OAuth，用于用户名/密码登录）
// ─────────────────────────────────────────────────────────────────────────────
export const appUsers = mysqlTable("app_users", {
  id: int("id").autoincrement().primaryKey(),
  /** 登录用户名（唯一） */
  username: varchar("username", { length: 64 }).notNull().unique(),
  /** bcrypt 哈希密码 */
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  /** 角色：admin=管理员/站长，user=普通用户 */
  role: mysqlEnum("role", ["admin", "user"]).default("user").notNull(),
  /** 是否为站长（唯一）：站长无锁死机制，三重验证后无需设备绑定 */
  isOwner: boolean("isOwner").default(false).notNull(),
  /** 账号状态：pending=待激活，active=已激活，rejected=已禁用，locked=已锁定 */
  status: mysqlEnum("status", ["pending", "active", "rejected", "locked"]).default("pending").notNull(),
  /** 备注 */
  remark: text("remark"),
  /** 邮箱 */
  email: varchar("email", { length: 320 }),
  /** 操作授权码哈希 */
  authCodeHash: varchar("authCodeHash", { length: 255 }),
  /** 首次登录绑定的 IP */
  firstLoginIp: varchar("firstLoginIp", { length: 64 }),
  /** 首次登录绑定的设备指纹 */
  firstLoginDevice: varchar("firstLoginDevice", { length: 128 }),
  /** 是否需要首次登录强制修改密码 */
  mustChangeOnLogin: boolean("mustChangeOnLogin").default(false).notNull(),
  /** 是否首次登录（尚未绑定IP+设备）：true=需要输入授权码绑定 */
  isFirstLogin: boolean("isfirstlogin").default(true).notNull(),
  /** 站长解锁后设置的临时授权码哈希（用户须用此码才能重新登录） */
  pendingAuthCodeHash: varchar("pendingauthcodehash", { length: 255 }),
  /** 最近一次活跃时间（每次成功登录时更新） */
  lastActiveAt: timestamp("lastActiveAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AppUser = typeof appUsers.$inferSelect;
export type InsertAppUser = typeof appUsers.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// 设备绑定白名单（站长授权后的 IP/设备）
// ─────────────────────────────────────────────────────────────────────────────
export const deviceBindings = mysqlTable("device_bindings", {
  id: int("id").autoincrement().primaryKey(),
  appUserId: int("appUserId").notNull(),
  ip: varchar("ip", { length: 64 }),
  deviceFingerprint: varchar("deviceFingerprint", { length: 128 }),
  /** 绑定类型：first=首次自动绑定，admin=站长手动授权 */
  bindType: mysqlEnum("bindType", ["first", "admin"]).default("first").notNull(),
  approvedAt: timestamp("approvedAt").defaultNow().notNull(),
});

export type DeviceBinding = typeof deviceBindings.$inferSelect;

// ─────────────────────────────────────────────────────────────────────────────
// 异常登录授权申请表（IP/设备不匹配时提交）
// ─────────────────────────────────────────────────────────────────────────────
export const authRequests = mysqlTable("auth_requests", {
  id: int("id").autoincrement().primaryKey(),
  appUserId: int("appUserId").notNull(),
  ip: varchar("ip", { length: 64 }).notNull(),
  deviceFingerprint: varchar("deviceFingerprint", { length: 128 }).notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  requestedAt: timestamp("requestedAt").defaultNow().notNull(),
  reviewedAt: timestamp("reviewedAt"),
});

export type AuthRequest = typeof authRequests.$inferSelect;

// ─────────────────────────────────────────────────────────────────────────────
// 域名检测记录表
// ─────────────────────────────────────────────────────────────────────────────
export const checkLogs = mysqlTable("check_logs", {
  id: int("id").autoincrement().primaryKey(),
  appUserId: int("appUserId").notNull(),
  domain: varchar("domain", { length: 255 }).notNull(),
  tool: varchar("tool", { length: 32 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CheckLog = typeof checkLogs.$inferSelect;

// ─────────────────────────────────────────────────────────────────────────────
// 域名复制记录表（每条「域名+端口」每用户仅允许复制一次，不同端口算独立）
// ─────────────────────────────────────────────────────────────────────────────
export const copyLogs = mysqlTable("copy_logs", {
  id: int("id").autoincrement().primaryKey(),
  appUserId: int("appUserId").notNull(),
  domain: varchar("domain", { length: 255 }).notNull(),
  port: varchar("port", { length: 10 }).default("").notNull(),
  fullUrl: varchar("fullUrl", { length: 512 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CopyLog = typeof copyLogs.$inferSelect;

// ─────────────────────────────────────────────────────────────────────────────
// 定时检测任务 - 域名分组表
// ─────────────────────────────────────────────────────────────────────────────
export const scheduledTaskGroups = mysqlTable("scheduled_task_groups", {
  id: int("id").autoincrement().primaryKey(),
  /** 分组名称 */
  name: varchar("name", { length: 128 }).notNull(),
  /** 分组类别标签（如：主站、备用、测试等） */
  category: varchar("category", { length: 64 }).default("默认").notNull(),
  /** 创建者用户 ID（app_users.id） */
  createdBy: int("createdBy").notNull(),
  /** 是否启用自动检测 */
  enabled: boolean("enabled").default(true).notNull(),
  /** 任务授权状态：pending=待授权（职员创建后默认），authorized=已授权（管理员/站长授权后可执行） */
  taskStatus: mysqlEnum("taskStatus", ["pending", "authorized"]).default("pending").notNull(),
  /** 授权人用户 ID（app_users.id） */
  authorizedBy: int("authorizedBy"),
  /** 授权时间 */
  authorizedAt: timestamp("authorizedAt"),
  /** 检测工具：itdog / aliyun / zhale */
  tool: mysqlEnum("tool", ["itdog", "aliyun", "zhale"]).default("itdog").notNull(),
  /** 备注 */
  remark: text("remark"),
  /**
   * 独立检测间隔（分钟）。null = 使用全局默认（60 分钟）。
   * 可选值：30 / 60 / 120 / 180 / 360 / 720 / 1440
   */
  intervalMinutes: int("intervalMinutes"),
  /** 上次定时检测触发时间（用于独立间隔计算） */
  lastScheduledAt: timestamp("lastScheduledAt"),
  /**
   * 检测优先级：high=高优先级（优先执行），normal=普通（默认）。
   * 调度器按 high → normal 顺序执行，同优先级内按 lastScheduledAt 升序。
   */
  priority: mysqlEnum("priority", ["high", "normal"]).default("normal").notNull(),
  /**
   * 检测时间窗口开始小时（0-23）。null = 不限制时间窗口。
   * 与 windowEndHour 配合使用，支持跨午夜（如 22-06）。
   */
  windowStartHour: int("windowStartHour"),
  /**
   * 检测时间窗口开始分钟（0-59）。null = 不限制分钟（即整点）。
   */
  windowStartMinute: int("windowStartMinute"),
  /**
   * 检测时间窗口结束小时（0-23）。null = 不限制时间窗口。
   * windowStartHour=22, windowEndHour=6 表示仅在 22:00-06:00 执行。
   */
  windowEndHour: int("windowEndHour"),
  /**
   * 检测时间窗口结束分钟（0-59）。null = 不限制分钟（即整点）。
   */
  windowEndMinute: int("windowEndMinute"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ScheduledTaskGroup = typeof scheduledTaskGroups.$inferSelect;;
export type InsertScheduledTaskGroup = typeof scheduledTaskGroups.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// 定时检测任务 - 域名表
// ─────────────────────────────────────────────────────────────────────────────
export const scheduledDomains = mysqlTable("scheduled_domains", {
  id: int("id").autoincrement().primaryKey(),
  /** 所属分组 ID */
  groupId: int("groupId").notNull(),
  /** 域名（不含协议，如 example.com） */
  domain: varchar("domain", { length: 255 }).notNull(),
  /** 最近一次检测时间 */
  lastCheckedAt: timestamp("lastCheckedAt"),
  /** 最近一次检测状态：ok=正常，warn=警告，error=异常，poor=质量差，pending=待检测 */
  lastStatus: mysqlEnum("lastStatus", ["ok", "warn", "error", "poor", "pending"]).default("pending").notNull(),
  /** 最近一次检测摘要（简短描述） */
  lastSummary: varchar("lastSummary", { length: 512 }),
  /** 连续检测失败次数（达到 3 次后暂停重检，重置后重新计数） */
  consecutiveErrors: int("consecutiveErrors").default(0).notNull(),
  /** 累计循环重置次数（consecutiveErrors 每次重置时 +1，超过 5 次触发 Telegram 永久失效告警） */
  totalFailureCycles: int("totalFailureCycles").default(0).notNull(),
  /** 最近一次检测的失败节点数（缓存，与自定义评级规则匹配用） */
  lastFailNodes: int("lastFailNodes"),
  /** 最近一次检测的平均延迟（毫秒，缓存，与自定义评级规则匹配用） */
  lastAvgLatencyMs: int("lastAvgLatencyMs"),
  /** 是否启用检测（false 时调度器跳过该域名） */
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ScheduledDomain = typeof scheduledDomains.$inferSelect;
export type InsertScheduledDomain = typeof scheduledDomains.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// 定时检测任务 - 检测结果历史表
// ─────────────────────────────────────────────────────────────────────────────
export const scheduledCheckResults = mysqlTable("scheduled_check_results", {
  id: int("id").autoincrement().primaryKey(),
  /** 关联域名 ID */
  domainId: int("domainId").notNull(),
  /** 检测时间 */
  checkedAt: timestamp("checkedAt").defaultNow().notNull(),
  /** 检测状态 */
  status: mysqlEnum("status", ["ok", "warn", "error"]).notNull(),
  /** 检测工具：aliyun / itdog / http */
  tool: varchar("tool", { length: 32 }).default("http").notNull(),
  /** HTTP 状态码（如 200、301、403 等） */
  httpStatus: int("httpStatus"),
  /** 响应时间（毫秒） */
  responseTimeMs: int("responseTimeMs"),
  /** 摘要信息 */
  summary: varchar("summary", { length: 512 }),
  /** 原始检测数据（JSON） */
  rawData: json("rawData"),
  /** 是否质量差（失败节点>4 或 平均延迟>5s） */
  qualityBad: boolean("qualityBad").default(false).notNull(),
});

export type ScheduledCheckResult = typeof scheduledCheckResults.$inferSelect;
export type InsertScheduledCheckResult = typeof scheduledCheckResults.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// IP 白名单表（站长管理，非站长用户须 IP 在白名单内才可访问）
// ─────────────────────────────────────────────────────────────────────────────
export const ipWhitelist = mysqlTable("ip_whitelist", {
  id: int("id").autoincrement().primaryKey(),
  /** IP 地址（支持 IPv4/IPv6） */
  ip: varchar("ip", { length: 64 }).notNull().unique(),
  /** 备注（如：张三的公司IP） */
  remark: varchar("remark", { length: 128 }),
  /** 添加人（app_users.id，必须是站长） */
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type IpWhitelist = typeof ipWhitelist.$inferSelect;
export type InsertIpWhitelist = typeof ipWhitelist.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// 管理员操作日志表（记录站长/管理员的关键操作，便于事后追溯）
// ─────────────────────────────────────────────────────────────────────────────
export const adminLogs = mysqlTable("admin_logs", {
  id: int("id").autoincrement().primaryKey(),
  /** 操作人 ID（app_users.id） */
  operatorId: int("operatorId").notNull(),
  /** 操作人用户名（冗余存储，防止账号被删后查不到） */
  operatorName: varchar("operatorName", { length: 64 }).notNull(),
  /** 操作类型：create_user=创建账号, delete_user=删除账号, unlock_user=解锁账号,
   *  reset_password=重置密码, add_ip=添加IP白名单, remove_ip=删除IP白名单,
   *  create_admin=创建管理员, reject_user=拒绝账号, approve_user=审批账号 */
  action: varchar("action", { length: 64 }).notNull(),
  /** 操作目标 ID（如被操作的用户 ID 或 IP 白名单 ID） */
  targetId: varchar("targetId", { length: 64 }),
  /** 操作目标名称（如被操作的用户名或 IP 地址） */
  targetName: varchar("targetName", { length: 128 }),
  /** 操作详情（JSON 格式，存储额外信息） */
  detail: json("detail"),
  /** 操作人 IP */
  ip: varchar("ip", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AdminLog = typeof adminLogs.$inferSelect;
export type InsertAdminLog = typeof adminLogs.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// 站内信表（定时检测发现质量差域名时，给所有用户发送通知）
// ─────────────────────────────────────────────────────────────────────────────
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  /** 接收用户 ID（app_users.id） */
  userId: int("userId").notNull(),
  /** 分组名称 */
  groupName: varchar("groupName", { length: 128 }).notNull(),
  /** 域名 */
  domain: varchar("domain", { length: 255 }).notNull(),
  /** 检测状态：poor=质量差 */
  status: varchar("status", { length: 32 }).notNull().default("poor"),
  /** 摘要信息 */
  summary: varchar("summary", { length: 512 }),
  /** 关联分组 ID（用于一键跳转） */
  groupId: int("groupId"),
  /** 触发时评级规则快照（JSON 数组，存储触发时生效的自定义规则） */
  ruleSnapshot: json("ruleSnapshot"),
  /** 是否已读 */
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// 分组操作日志表（记录分组/域名的增删操作，保留近一周数据）
// ─────────────────────────────────────────────────────────────────────────────
export const groupOperationLogs = mysqlTable("group_operation_logs", {
  id: int("id").autoincrement().primaryKey(),
  /** 操作人 ID（app_users.id） */
  operatorId: int("operatorId").notNull(),
  /** 操作人用户名（冗余存储） */
  operatorName: varchar("operatorName", { length: 64 }).notNull(),
  /** 操作类型：create_group=创建分组, delete_group=删除分组,
   *  add_domain=添加域名, remove_domain=删除域名 */
  action: varchar("action", { length: 64 }).notNull(),
  /** 关联分组 ID */
  groupId: int("groupId"),
  /** 分组名称（冗余存储，防止分组被删后查不到） */
  groupName: varchar("groupName", { length: 128 }).notNull(),
  /** 分组类别标签（如：A8、Toff 等） */
  groupCategory: varchar("groupCategory", { length: 64 }),
  /** 操作的域名（添加/删除域名时填写） */
  domainName: varchar("domainName", { length: 255 }),
  /** 操作详情（JSON 格式，存储额外信息） */
  detail: json("detail"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type GroupOperationLog = typeof groupOperationLogs.$inferSelect;
export type InsertGroupOperationLog = typeof groupOperationLogs.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// Telegram 告警消息记录表（存储发出的告警消息 message_id，用于 Reply 换域名）
// ─────────────────────────────────────────────────────────────────────────────
export const telegramAlertMessages = mysqlTable("telegram_alert_messages", {
  id: int("id").autoincrement().primaryKey(),
  /** 告警类型：domain_alert=域名质量告警，group_delete=分组删除预警 */
  alertType: varchar("alertType", { length: 32 }).notNull().default("domain_alert"),
  /** Telegram 消息 ID（用于匹配 reply_to_message） */
  messageId: bigint("messageId", { mode: "number" }).notNull(),
  /** Telegram 群组/聊天 ID */
  chatId: bigint("chatId", { mode: "number" }).notNull(),
  /** 关联的域名（scheduled_domains.domain），group_delete 类型时为空字符串 */
  domain: varchar("domain", { length: 255 }).notNull().default(""),
  /** 关联的域名记录 ID（scheduled_domains.id），group_delete 类型时为 0 */
  domainId: int("domainId").notNull().default(0),
  /** 关联的分组 ID */
  groupId: int("groupId").notNull(),
  /** 分组名称（冗余存储） */
  groupName: varchar("groupName", { length: 128 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type TelegramAlertMessage = typeof telegramAlertMessages.$inferSelect;
export type InsertTelegramAlertMessage = typeof telegramAlertMessages.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// 分组自定义评级规则表
// ─────────────────────────────────────────────────────────────────────────────
/**
 * 每个分组可为四个评级（正常/普通/较差/极差）分别配置一条规则。
 * 每条规则包含：失败节点数阈值、平均延迟阈值、逻辑运算符（AND/OR）。
 * 当域名检测结果同时满足多个评级时，取最严重的评级。
 * 如果分组未配置规则，则使用全局默认规则。
 */
export const groupRatingRules = mysqlTable("group_rating_rules", {
  id: int("id").autoincrement().primaryKey(),
  /** 关联分组 ID */
  groupId: int("groupId").notNull(),
  /** 评级等级：good=正常, normal=普通, poor=较差, bad=极差 */
  level: mysqlEnum("level", ["good", "normal", "poor", "bad"]).notNull(),
  /**
   * 失败节点数阈值（包含）。null = 不判断此条件。
   * 当 operator=AND 时：失败节点数 >= maxFailNodes 且 延迟 >= maxAvgLatencyMs 才触发
   * 当 operator=OR 时：失败节点数 >= maxFailNodes 或 延迟 >= maxAvgLatencyMs 就触发
   */
  maxFailNodes: int("maxFailNodes"),
  /** 平均延迟阈值（毫秒，包含）。null = 不判断此条件。 */
  maxAvgLatencyMs: int("maxAvgLatencyMs"),
  /** 条件逻辑运算符：AND=同时满足两个条件, OR=满足任意一个条件 */
  operator: mysqlEnum("operator", ["AND", "OR"]).default("AND").notNull(),
  /** 是否启用此规则 */
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GroupRatingRule = typeof groupRatingRules.$inferSelect;
export type InsertGroupRatingRule = typeof groupRatingRules.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// 调度器每日检测统计表（记录每天的检测次数，用于展示近7天/30天统计）
// ─────────────────────────────────────────────────────────────────────────────
export const schedulerDailyStats = mysqlTable("scheduler_daily_stats", {
  id: int("id").autoincrement().primaryKey(),
  /** 统计日期（格式：YYYY-MM-DD，唯一键） */
  statDate: varchar("statDate", { length: 10 }).notNull().unique(),
  /** 当天累计检测域名次数（每次 runGroupCheck 完成后累加该分组的域名数量） */
  checkedCount: int("checkedCount").default(0).notNull(),
  /** 当天累计检测分组运行次数 */
  runCount: int("runCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SchedulerDailyStat = typeof schedulerDailyStats.$inferSelect;
export type InsertSchedulerDailyStat = typeof schedulerDailyStats.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// 端口厂商表（端口生成页面使用）
// ─────────────────────────────────────────────────────────────────────────────
export const portVendors = mysqlTable("port_vendors", {
  id: int("id").autoincrement().primaryKey(),
  /** 厂商名称（如：A8、Toff、自定义厂商） */
  name: varchar("name", { length: 64 }).notNull(),
  /** 厂商绑定的 CDN 类型（绑定后导入域名时自动锁定该 CDN） */
  cdnType: mysqlEnum("vendor_cdnType", ["a8", "a8543", "toff"]),
  /** 创建人 ID（app_users.id） */
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PortVendor = typeof portVendors.$inferSelect;
export type InsertPortVendor = typeof portVendors.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// 厂商域名表（按厂商+分类存储域名）
// ─────────────────────────────────────────────────────────────────────────────
/**
 * 域名分类（11类）：
 * web=WEB, h5=H5, full=全站, sports=体育, live=真人,
 * proxy_web=代理web, proxy_h5=代理H5, lite_h5=精简版H5, lite_sports_h5=精简版体育H5,
 * fujian_web=福建敏感区域名WEB, fujian_h5=福建敏感区域名H5
 */
export const DOMAIN_CATEGORIES = [
  "web", "h5", "full", "sports", "live",
  "proxy_web", "proxy_h5", "lite_h5", "lite_sports_h5",
  "fujian_web", "fujian_h5"
] as const;

export type DomainCategory = typeof DOMAIN_CATEGORIES[number];

export const DOMAIN_CATEGORY_LABELS: Record<DomainCategory, string> = {
  web: "WEB",
  h5: "H5",
  full: "全站",
  sports: "体育",
  live: "真人",
  proxy_web: "代理web",
  proxy_h5: "代理H5",
  lite_h5: "精简版H5",
  lite_sports_h5: "精简版体育H5",
  fujian_web: "福建敏感区域名WEB",
  fujian_h5: "福建敏感区域名H5",
};

/**
 * 站点类型（A1-A9）
 */
export const SITE_TYPES = ["A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "A9"] as const;
export type SiteType = typeof SITE_TYPES[number];

/**
 * CDN 类型（对应端口组）
 */
export const CDN_TYPES = ["a8", "a8543", "toff"] as const;
export type CdnType = typeof CDN_TYPES[number];

export const CDN_TYPE_LABELS: Record<CdnType, string> = {
  a8: "A8",
  a8543: "A-8543",
  toff: "Toff",
};

export const vendorDomains = mysqlTable("vendor_domains", {
  id: int("id").autoincrement().primaryKey(),
  /** 所属厂商 ID */
  vendorId: int("vendorId").notNull(),
  /** 域名（不含协议，如 example.com） */
  domain: varchar("domain", { length: 255 }).notNull(),
  /**
   * 域名分类：
   * web=WEB, h5=H5, full=全站, sports=体育, live=真人,
   * proxy_web=代理web, proxy_h5=代理H5, lite_h5=精简版H5, lite_sports_h5=精简版体育H5
   */
  category: mysqlEnum("category", [
    "web", "h5", "full", "sports", "live",
    "proxy_web", "proxy_h5", "lite_h5", "lite_sports_h5",
    "fujian_web", "fujian_h5"
  ]).notNull(),
  /**
   * 站点类型（A1-A9），可选，为空表示通用
   */
  siteType: mysqlEnum("siteType", ["A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "A9"]),
  /**
   * CDN 类型（a8=A8, a8543=A-8543, toff=Toff），可选，为空表示通用
   */
  cdnType: mysqlEnum("cdnType", ["a8", "a8543", "toff"]),
  /**
   * 域名库类型：main=主推域名库（默认）, seo=SEO域名库
   */
  poolType: mysqlEnum("poolType", ["main", "seo"]).default("main").notNull(),
  /**
   * 来源类型（仅 poolType=seo 时有意义）：
   * manual=手动上传/脚本自动换用的在用域名（显示在 SEO 导航）
   * stock=批量导入的库存待用域名（不显示在 SEO 导航）
   * 主推域名库（poolType=main）此字段为 null
   */
  source: mysqlEnum("source", ["manual", "stock"]),
  /** 创建人 ID（app_users.id） */
  createdBy: int("createdBy").notNull(),
  /**
   * 是否已使用：生成结果勾选后标记为 true，后续生成跳过该域名
   */
  isUsed: boolean("isUsed").default(false).notNull(),
  /** 标记已使用的时间 */
  usedAt: timestamp("usedAt"),
  // ── SEO 域名检测配置字段（仅 poolType=seo 时使用）──
  /**
   * 检测工具（仅 poolType=seo 时有意义）：
   * itdog=ITDOG（默认）, aliyun=阴云检测, zhale=炸了么
   */
  checkTool: mysqlEnum("checkTool", ["itdog", "aliyun", "zhale"]).default("itdog"),
  /**
   * 跳过标记（仅 poolType=seo 时有意义）：
   * true=候选域名预检测评级差，后续自动换域时跳过此域名
   * 如连续多轮检测全部失败则返回此标记（取消标记）
   */
  skipFlag: boolean("skipFlag").default(false).notNull(),
  // ── SEO 域名检测状态字段（仅 poolType=seo 时使用）──
  /** 最近一次检测时间 */
  lastCheckedAt: timestamp("lastCheckedAt"),
  /** 最近一次检测状态：ok=正常，warn=警告，poor=质量差，error=异常，pending=待检测 */
  lastStatus: mysqlEnum("lastStatus", ["ok", "warn", "poor", "error", "pending"]),
  /** 最近一次检测摘要 */
  lastSummary: varchar("lastSummary", { length: 512 }),
  /** 最近一次检测的失败节点数 */
  lastFailNodes: int("lastFailNodes"),
  /** 最近一次检测的平均延迟（毫秒） */
  lastAvgLatencyMs: int("lastAvgLatencyMs"),
  /** 预热检测状态（仅 poolType=seo, source=stock 时有意义）：null=未预热, ok=预热通过, poor=预热质量差 */
  preheatStatus: mysqlEnum("preheatStatus", ["ok", "poor"]),
  /** 预热检测时间 */
  preheatAt: timestamp("preheatAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VendorDomain = typeof vendorDomains.$inferSelect;
export type InsertVendorDomain = typeof vendorDomains.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// 系统设置表（键值对，存储全局配置如低库存告警阈值）
// ─────────────────────────────────────────────────────────────────────────────
export const systemSettings = mysqlTable("system_settings", {
  id: int("id").autoincrement().primaryKey(),
  /** 设置键（唯一） */
  key: varchar("key", { length: 64 }).notNull().unique(),
  /** 设置值（字符串，使用时按需转换类型） */
  value: varchar("value", { length: 255 }).notNull(),
  /** 备注说明 */
  remark: varchar("remark", { length: 255 }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = typeof systemSettings.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// 低库存告警冷却记录表（防止短时间内重复推送同一厂商的告警）
// ─────────────────────────────────────────────────────────────────────────────
export const lowStockAlertLog = mysqlTable("low_stock_alert_log", {
  id: int("id").autoincrement().primaryKey(),
  /** 厂商 ID（port_vendors.id） */
  vendorId: int("vendorId").notNull().unique(),
  /** 最近一次告警推送时间 */
  lastAlertAt: timestamp("lastAlertAt").defaultNow().notNull(),
});

export type LowStockAlertLog = typeof lowStockAlertLog.$inferSelect;

// ─────────────────────────────────────────────────────────────────────────────
// 系统设置修改历史表（记录每次设置变更，支持查看和恢复）
// ─────────────────────────────────────────────────────────────────────────────
export const settingHistory = mysqlTable("setting_history", {
  id: int("id").autoincrement().primaryKey(),
  /** 设置键（对应 system_settings.key） */
  key: varchar("key", { length: 64 }).notNull(),
  /** 变更前的旧值（首次设置时为 null） */
  oldValue: text("oldValue"),
  /** 变更后的新值 */
  newValue: text("newValue").notNull(),
  /** 操作人（用户名或 "system"） */
  operator: varchar("operator", { length: 128 }).default("admin").notNull(),
  /** 变更时间 */
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type SettingHistory = typeof settingHistory.$inferSelect;
export type InsertSettingHistory = typeof settingHistory.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// Telegram 群组-站点映射表（配置群组 ID 对应哪个站点类型）
// ─────────────────────────────────────────────────────────────────────────────
export const telegramChatSiteMappings = mysqlTable("telegram_chat_site_mappings", {
  id: int("id").autoincrement().primaryKey(),
  /** Telegram 群组 ID（负数） */
  chatId: bigint("chatId", { mode: "number" }).notNull().unique(),
  /** 群组备注名称（方便识别） */
  chatName: varchar("chatName", { length: 128 }).notNull(),
  /** 对应的站点类型（A1-A9） */
  siteType: mysqlEnum("siteType", ["A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "A9"]).notNull(),
  /** 是否启用关键词监听 */
  enabled: boolean("enabled").default(true).notNull(),
  /** 收到关键词后立即回复的文案（为空则不回复） */
  replyText: text("replyText"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TelegramChatSiteMapping = typeof telegramChatSiteMappings.$inferSelect;
export type InsertTelegramChatSiteMapping = typeof telegramChatSiteMappings.$inferInsert;

// ─── SEO 关键词配置表 ─────────────────────────────────────────────────────
export const seoTriggerKeywords = mysqlTable("seo_trigger_keywords", {
  id: int("id").autoincrement().primaryKey(),
  /** 关联站点（为空表示全局关键词） */
  siteType: mysqlEnum("siteType", ["A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "A9"]).notNull(),
  /** 关键词内容 */
  keyword: varchar("keyword", { length: 128 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SeoTriggerKeyword = typeof seoTriggerKeywords.$inferSelect;
export type InsertSeoTriggerKeyword = typeof seoTriggerKeywords.$inferInsert;

// ─── SEO 通知文案配置表 ─────────────────────────────────────────────────────
export const seoNotifyTemplates = mysqlTable("seo_notify_templates", {
  id: int("id").autoincrement().primaryKey(),
  /** 关联站点 */
  siteType: mysqlEnum("siteType", ["A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "A9"]).notNull(),
  /**
   * 模板类型:
   * - replace_done: 域名替换完成通知（发到群内）
   * - check_start: 开始检测回复文案（发到群内）
   */
  templateType: mysqlEnum("templateType", ["replace_done", "check_start", "reply_keyword"]).notNull(),
  /** 文案内容，支持占位符: {{siteType}} {{domain}} {{category}} {{newDomain}} */
  content: text("content").notNull(),
  /** 是否启用该模板，禁用后将不发送该类型通知 */
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => ({
  uniqSiteTemplate: unique("uniq_site_template").on(t.siteType, t.templateType),
}));

export type SeoNotifyTemplate = typeof seoNotifyTemplates.$inferSelect;
export type InsertSeoNotifyTemplate = typeof seoNotifyTemplates.$inferInsert;

// ─── 检测工具健康状态表 ─────────────────────────────────────────────────────
/**
 * 记录每次探针检测的结果，用于判断工具是否健康
 * 每小时对 ITDOG/阿里云/炸了么 各发一次探针（用固定测试域名）
 */
export const toolHealthLogs = mysqlTable("tool_health_logs", {
  id: int("id").autoincrement().primaryKey(),
  /** 检测工具 */
  tool: mysqlEnum("tool", ["itdog", "aliyun", "zhale"]).notNull(),
  /** 探针是否成功（能正常返回结果即为 true） */
  success: boolean("success").notNull(),
  /** 失败原因（success=false 时记录） */
  errorMsg: varchar("errorMsg", { length: 512 }),
  /** 探针耗时（毫秒） */
  durationMs: int("durationMs"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ToolHealthLog = typeof toolHealthLogs.$inferSelect;
export type InsertToolHealthLog = typeof toolHealthLogs.$inferInsert;

// ─── SEO 候选域名预热日志表 ─────────────────────────────────────────────────
/**
 * 记录预热任务的执行日志（每次非高峰期预热的汇总信息）
 */
export const seoPreheatLogs = mysqlTable("seo_preheat_logs", {
  id: int("id").autoincrement().primaryKey(),
  /** 本次预热涉及的站点类型 */
  siteType: mysqlEnum("siteType", ["A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "A9"]).notNull(),
  /** 本次预热检测的域名总数 */
  totalChecked: int("totalChecked").notNull().default(0),
  /** 质量合格（ok/warn）的数量 */
  passedCount: int("passedCount").notNull().default(0),
  /** 质量差（poor/error）的数量 */
  failedCount: int("failedCount").notNull().default(0),
  /** 使用的检测工具 */
  tool: mysqlEnum("tool", ["itdog", "aliyun", "zhale"]).notNull().default("itdog"),
  /** 耗时（毫秒） */
  durationMs: int("durationMs"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type SeoPreheatLog = typeof seoPreheatLogs.$inferSelect;
export type InsertSeoPreheatLog = typeof seoPreheatLogs.$inferInsert;
