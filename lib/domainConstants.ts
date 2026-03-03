// ─── 域名相关常量（前端共用）────────────────────────────────────────────

/** 主推库全部分类（9类） */
export const DOMAIN_CATEGORIES = [
  "web", "h5", "full", "sports", "live",
  "proxy_web", "proxy_h5", "lite_h5", "lite_sports_h5",
  "fujian_web", "fujian_h5",
] as const;

export type DomainCategory = typeof DOMAIN_CATEGORIES[number];

export const CATEGORY_LABELS: Record<DomainCategory, string> = {
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

/** SEO 库专用分类（6类） */
export const SEO_CATEGORIES = [
  "web", "h5", "full", "sports", "fujian_web", "fujian_h5",
] as const;

export type SeoDomainCategory = typeof SEO_CATEGORIES[number];

export const SEO_CATEGORY_LABELS: Record<SeoDomainCategory, string> = {
  web: "WEB",
  h5: "H5",
  full: "全站",
  sports: "体育",
  fujian_web: "福建敏感区域名WEB",
  fujian_h5: "福建敏感区域名H5",
};

export const SITE_TYPES = ["A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "A9"] as const;
export type SiteType = typeof SITE_TYPES[number];

export const CDN_TYPES = ["a8", "a8543", "toff"] as const;
export type CdnType = typeof CDN_TYPES[number];

export const CDN_TYPE_LABELS: Record<CdnType, string> = {
  a8: "A8",
  a8543: "A-8543",
  toff: "Toff",
};

export const PORT_GROUPS = [
  {
    id: 'a8', title: 'A8', color: 'blue' as const,
    ports: [6001, 6002, 6003, 6004, 6443, 7443, 7988, 8000, 8001, 8002, 8003, 8004, 8005, 8443, 8553, 8663, 9443, 9553, 9663],
  },
  {
    id: 'a8543', title: 'A-8543', color: 'violet' as const,
    ports: [3353, 4697, 6022, 6848, 7382, 2466, 2701, 2866, 3127, 3410, 3639, 3962, 4341, 4543, 6746, 7917, 8826, 9001, 9249],
  },
  {
    id: 'toff', title: 'Toff', color: 'emerald' as const,
    ports: [
      9003, 9010, 9013, 9023, 9024, 9033, 9037, 9043, 9048,
      9053, 9056, 9061, 9063, 9070, 9073, 9077, 9081, 9093,
      9103, 9109, 9113, 9122, 9123, 9132, 9133, 9142, 9143,
      9149, 9152, 9153, 9162, 9163, 9168, 9172, 9173, 9174,
      9179, 9182, 9183, 9192, 9193, 9960, 9961, 9962, 9963,
      9964, 9965, 9966, 9967, 9968, 9969, 9970, 9971, 9972,
      9973, 9974, 9975, 9976, 9977, 9978, 9979,
    ],
  },
] as const;

export type PortGroupId = typeof PORT_GROUPS[number]['id'];

export const PORT_GROUP_COLORS = {
  blue: { selected: 'bg-blue-600 text-white border-blue-600', unselected: 'bg-card text-blue-700 border-blue-300 hover:bg-blue-50/20', dot: 'bg-blue-500' },
  violet: { selected: 'bg-violet-600 text-white border-violet-600', unselected: 'bg-card text-violet-700 border-violet-300 hover:bg-violet-50/20', dot: 'bg-violet-500' },
  emerald: { selected: 'bg-emerald-600 text-white border-emerald-600', unselected: 'bg-card text-emerald-700 border-emerald-300 hover:bg-emerald-50/20', dot: 'bg-emerald-500' },
};

export type CheckToolId = 'itdog' | 'aliyun' | 'both' | 'zhale';

export const CHECK_TOOLS: { id: CheckToolId; label: string; icon: string }[] = [
  { id: 'itdog', label: 'ITDOG', icon: '🐕' },
  { id: 'aliyun', label: '阿里云', icon: '☁️' },
  { id: 'zhale', label: '炸了么', icon: '💥' },
  { id: 'both', label: '两者', icon: '⚡' },
];

/** 清理域名：去掉协议前缀和路径 */
export function cleanDomain(raw: string): string {
  return raw.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '').toLowerCase();
}
