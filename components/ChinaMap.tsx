/**
 * ChinaMap - 精确中国省份SVG地图
 * 使用阿里云DataV GeoJSON数据转换的省份轮廓
 * 参考图片样式：白色省界线 + 响应速度着色
 * 
 * v3: 修正 viewBox 为 "-4 -11 808 441"，完整显示所有省份（含黑龙江/新疆/内蒙古/海南）
 *     去除下方多余留白（海南路径中 y>430 的小岛不展示），地图居中紧凑显示
 */

import { useRef, useState } from 'react';
import { PROVINCE_PATHS } from './chinaProvinceData';

// ─── 颜色分级 ─────────────────────────────────────────────────────────────────
export const SPEED_LEVELS = [
  { label: '极快', desc: '<200ms',  max: 200,      color: '#22c55e' },
  { label: '快',   desc: '<500ms',  max: 500,      color: '#84cc16' },
  { label: '中等', desc: '<1s',     max: 1000,     color: '#f59e0b' },
  { label: '慢',   desc: '<2s',     max: 2000,     color: '#f97316' },
  { label: '很慢', desc: '≥2s',     max: Infinity, color: '#ef4444' },
];

export function getSpeedLevel(ms: number) {
  return SPEED_LEVELS.find(l => ms < l.max) ?? SPEED_LEVELS[SPEED_LEVELS.length - 1];
}

export function getSpeedColor(ms: number): string {
  if (ms <= 0) return '#cbd5e1';
  return getSpeedLevel(ms).color;
}

// ─── 省份名称别名映射（检测数据中的省份名 → 地图省份名）──────────────────────
const PROVINCE_ALIAS: Record<string, string> = {
  '黑龙江': '黑龙江', '内蒙古': '内蒙古', '广东': '广东', '广西': '广西',
  '新疆': '新疆', '重庆': '重庆', '上海': '上海', '北京': '北京',
  '天津': '天津', '辽宁': '辽宁', '山东': '山东', '浙江': '浙江',
  '江苏': '江苏', '江西': '江西', '吉林': '吉林', '四川': '四川',
  '贵州': '贵州', '云南': '云南', '陕西': '陕西', '山西': '山西',
  '宁夏': '宁夏', '青海': '青海', '海南': '海南', '福建': '福建',
  '湖南': '湖南', '湖北': '湖北', '河南': '河南', '河北': '河北',
  '甘肃': '甘肃', '安徽': '安徽', '西藏': '西藏', '台湾': '台湾',
  '香港': '香港', '澳门': '澳门',
};

// ─── 组件 Props ───────────────────────────────────────────────────────────────
interface ProvinceData {
  avgMs: number;
  count: number;
  failed: number;
}

interface ChinaMapProps {
  provinceData: Record<string, ProvinceData>;
}

export default function ChinaMap({ provinceData }: ChinaMapProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // 构建省份 → 数据的映射（将检测数据中的省份名映射到地图省份名）
  const dataMap: Record<string, ProvinceData> = {};
  for (const [prov, data] of Object.entries(provinceData)) {
    const mapName = PROVINCE_ALIAS[prov] || prov;
    if (mapName && PROVINCE_PATHS[mapName]) {
      dataMap[mapName] = data;
    }
  }

  const hoveredData = hovered ? dataMap[hovered] : null;

  return (
    <div className="w-full space-y-3">
      {/* 地图容器：缩小为原来的一半，居中显示 */}
      <div className="flex justify-center">
        <div
          ref={containerRef}
          className="relative bg-white rounded border border-slate-200 overflow-hidden"
          style={{ width: '65%', minWidth: '320px', maxWidth: '624px' }}
        >
        <svg
          viewBox="-4 -11 808 441"
          className="w-full"
          style={{ display: 'block', background: '#f8fafc', aspectRatio: '808 / 507' }}
          onMouseLeave={() => setHovered(null)}
        >
            <defs>
              <filter id="map-shadow" x="-5%" y="-5%" width="110%" height="110%">
                <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#00000015" />
              </filter>
            </defs>

            {/* 省份路径 */}
            {Object.entries(PROVINCE_PATHS).map(([name, { d, cx, cy }]) => {
              const data = dataMap[name];
              const ms = data?.avgMs ?? 0;
              const fill = ms > 0 ? getSpeedColor(ms) : '#cbd5e1';
              const isHovered = hovered === name;

              return (
                <g key={name}>
                  <path
                    d={d}
                    fill={fill}
                    stroke="#ffffff"
                    strokeWidth={isHovered ? 1.5 : 0.7}
                    opacity={isHovered ? 1 : 0.9}
                    style={{
                      cursor: data ? 'pointer' : 'default',
                      transition: 'opacity 0.15s, stroke-width 0.1s',
                      filter: isHovered ? 'brightness(1.1)' : undefined,
                    }}
                    onMouseEnter={(e) => {
                      if (data) {
                        setHovered(name);
                        const rect = (e.currentTarget.closest('svg') as SVGSVGElement).getBoundingClientRect();
                        const svgW = rect.width;
                        const svgH = rect.height;
                        // 将SVG坐标转换为屏幕坐标（viewBox: -4 -11 808 441，实际渲染高度因 aspectRatio 放大 15%）
                        const scaleX = svgW / 808;
                        // svgH 是实际渲染高度（507），viewBox 高度为 441，需按实际比例换算
                        const scaleY = svgH / 441;
                        setTooltipPos({
                          x: (cx - (-4)) * scaleX,
                          y: (cy - (-11)) * scaleY,
                        });
                      }
                    }}
                    onMouseLeave={() => setHovered(null)}
                  />
                  {/* 省份名称标签（仅大省份显示）*/}
                  {data && ms > 0 && (
                    <text
                      x={cx}
                      y={cy + 3}
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight="600"
                      fill="#1e293b"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      {name.length > 3 ? name.slice(0, 3) : name}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Tooltip */}
          {hovered && hoveredData && (
            <div
              className="absolute z-20 pointer-events-none"
              style={{
                left: Math.min(tooltipPos.x + 10, (containerRef.current?.clientWidth ?? 300) - 140),
                top: Math.max(tooltipPos.y - 70, 8),
              }}
            >
              <div className="bg-slate-800/95 text-white text-xs rounded px-3 py-2.5 border border-slate-600/50 min-w-32">
                <div className="font-semibold text-sm mb-1.5 text-white">{hovered}</div>
                <div className="flex items-center justify-between gap-4 mb-0.5">
                  <span className="text-slate-300">平均响应</span>
                  <span
                    className="font-mono font-bold"
                    style={{ color: getSpeedColor(hoveredData.avgMs) }}
                  >
                    {hoveredData.avgMs.toFixed(0)} ms
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 mb-0.5">
                  <span className="text-slate-300">速度评级</span>
                  <span
                    className="font-semibold"
                    style={{ color: getSpeedColor(hoveredData.avgMs) }}
                  >
                    {getSpeedLevel(hoveredData.avgMs).label}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-300">检测节点</span>
                  <span className="font-mono text-white">{hoveredData.count} 个</span>
                </div>
                {hoveredData.failed > 0 && (
                  <div className="flex items-center justify-between gap-4 mt-0.5">
                    <span className="text-red-400">失败节点</span>
                    <span className="font-mono text-red-400">{hoveredData.failed} 个</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 图例 */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1">
        {SPEED_LEVELS.map(level => (
          <div key={level.label} className="flex items-center gap-1.5">
            <div
              className="w-3.5 h-3.5 rounded-sm flex-shrink-0"
              style={{ backgroundColor: level.color }}
            />
            <span className="text-xs text-slate-600">
              {level.label}
              <span className="text-slate-400 ml-1">({level.desc})</span>
            </span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded-sm flex-shrink-0 bg-slate-300" />
          <span className="text-xs text-slate-400">无数据</span>
        </div>
      </div>

      {/* 省份速度网格 */}
      {Object.keys(dataMap).length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1.5">
          {Object.entries(dataMap)
            .sort((a, b) => a[1].avgMs - b[1].avgMs)
            .map(([name, data]) => {
              const level = getSpeedLevel(data.avgMs);
              return (
                <div
                  key={name}
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded border text-xs"
                  style={{
                    backgroundColor: level.color + '18',
                    borderColor: level.color + '40',
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: level.color }}
                  />
                  <span className="font-medium text-slate-700 truncate">{name}</span>
                  <span className="font-mono text-slate-500 ml-auto flex-shrink-0 text-[10px]">
                    {data.avgMs.toFixed(0)}ms
                  </span>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
