export interface BudgetLevel {
  accommodation: string;
  food: string;
  transport: string;
  tickets: string;
  total: string;
}

/** 城市预算数据：城市 -> 消费档次 -> 各项费用 */
export const budgetData: Record<string, Record<string, BudgetLevel>> = {
  "北京": {
    "经济": { accommodation: "¥150-300/晚", food: "¥80-120/天", transport: "¥30/天", tickets: "¥50-100/天", total: "¥310-550/天" },
    "中等": { accommodation: "¥400-700/晚", food: "¥150-250/天", transport: "¥60/天", tickets: "¥100-200/天", total: "¥710-1210/天" },
    "豪华": { accommodation: "¥1200+/晚", food: "¥400+/天", transport: "¥200/天", tickets: "¥200+/天", total: "¥2000+/天" },
  },
  "上海": {
    "经济": { accommodation: "¥150-300/晚", food: "¥80-130/天", transport: "¥30/天", tickets: "¥50-100/天", total: "¥310-560/天" },
    "中等": { accommodation: "¥400-800/晚", food: "¥150-280/天", transport: "¥60/天", tickets: "¥100-200/天", total: "¥710-1340/天" },
    "豪华": { accommodation: "¥1500+/晚", food: "¥500+/天", transport: "¥200/天", tickets: "¥300+/天", total: "¥2500+/天" },
  },
  "成都": {
    "经济": { accommodation: "¥100-200/晚", food: "¥60-100/天", transport: "¥20/天", tickets: "¥50-80/天", total: "¥230-400/天" },
    "中等": { accommodation: "¥300-500/晚", food: "¥150-250/天", transport: "¥50/天", tickets: "¥80-150/天", total: "¥580-950/天" },
    "豪华": { accommodation: "¥800+/晚", food: "¥400+/天", transport: "¥150/天", tickets: "¥150+/天", total: "¥1500+/天" },
  },
  "三亚": {
    "经济": { accommodation: "¥200-400/晚", food: "¥100-150/天", transport: "¥50/天", tickets: "¥100-200/天", total: "¥450-800/天" },
    "中等": { accommodation: "¥500-1000/晚", food: "¥200-350/天", transport: "¥100/天", tickets: "¥200-300/天", total: "¥1000-1750/天" },
    "豪华": { accommodation: "¥2000+/晚", food: "¥500+/天", transport: "¥200/天", tickets: "¥300+/天", total: "¥3000+/天" },
  },
  "杭州": {
    "经济": { accommodation: "¥150-280/晚", food: "¥70-110/天", transport: "¥25/天", tickets: "¥50-80/天", total: "¥295-495/天" },
    "中等": { accommodation: "¥350-600/晚", food: "¥150-250/天", transport: "¥50/天", tickets: "¥100-200/天", total: "¥650-1100/天" },
    "豪华": { accommodation: "¥1000+/晚", food: "¥400+/天", transport: "¥150/天", tickets: "¥200+/天", total: "¥1750+/天" },
  },
  "西安": {
    "经济": { accommodation: "¥120-250/晚", food: "¥60-100/天", transport: "¥25/天", tickets: "¥60-120/天", total: "¥265-495/天" },
    "中等": { accommodation: "¥300-500/晚", food: "¥150-250/天", transport: "¥60/天", tickets: "¥120-200/天", total: "¥630-1010/天" },
    "豪华": { accommodation: "¥800+/晚", food: "¥400+/天", transport: "¥150/天", tickets: "¥200+/天", total: "¥1550+/天" },
  },
  "重庆": {
    "经济": { accommodation: "¥100-220/晚", food: "¥60-100/天", transport: "¥20/天", tickets: "¥30-80/天", total: "¥210-420/天" },
    "中等": { accommodation: "¥300-500/晚", food: "¥150-250/天", transport: "¥50/天", tickets: "¥80-150/天", total: "¥580-950/天" },
    "豪华": { accommodation: "¥800+/晚", food: "¥400+/天", transport: "¥150/天", tickets: "¥150+/天", total: "¥1500+/天" },
  },
  "厦门": {
    "经济": { accommodation: "¥150-280/晚", food: "¥70-120/天", transport: "¥25/天", tickets: "¥50-100/天", total: "¥295-525/天" },
    "中等": { accommodation: "¥350-600/晚", food: "¥150-250/天", transport: "¥60/天", tickets: "¥100-180/天", total: "¥660-1090/天" },
    "豪华": { accommodation: "¥1000+/晚", food: "¥400+/天", transport: "¥150/天", tickets: "¥180+/天", total: "¥1730+/天" },
  },
  "桂林": {
    "经济": { accommodation: "¥100-200/晚", food: "¥60-100/天", transport: "¥30/天", tickets: "¥80-150/天", total: "¥270-480/天" },
    "中等": { accommodation: "¥250-450/晚", food: "¥120-200/天", transport: "¥60/天", tickets: "¥150-250/天", total: "¥580-960/天" },
    "豪华": { accommodation: "¥800+/晚", food: "¥350+/天", transport: "¥150/天", tickets: "¥250+/天", total: "¥1550+/天" },
  },
  "丽江": {
    "经济": { accommodation: "¥100-200/晚", food: "¥60-100/天", transport: "¥30/天", tickets: "¥80-120/天", total: "¥270-450/天" },
    "中等": { accommodation: "¥300-600/晚", food: "¥120-200/天", transport: "¥80/天", tickets: "¥120-250/天", total: "¥620-1130/天" },
    "豪华": { accommodation: "¥1000+/晚", food: "¥350+/天", transport: "¥200/天", tickets: "¥250+/天", total: "¥1800+/天" },
  },
  "青岛": {
    "经济": { accommodation: "¥120-250/晚", food: "¥70-120/天", transport: "¥25/天", tickets: "¥40-80/天", total: "¥255-475/天" },
    "中等": { accommodation: "¥300-500/晚", food: "¥150-250/天", transport: "¥50/天", tickets: "¥80-150/天", total: "¥580-950/天" },
    "豪华": { accommodation: "¥800+/晚", food: "¥400+/天", transport: "¥150/天", tickets: "¥150+/天", total: "¥1500+/天" },
  },
  "长沙": {
    "经济": { accommodation: "¥100-200/晚", food: "¥50-90/天", transport: "¥20/天", tickets: "¥30-60/天", total: "¥200-370/天" },
    "中等": { accommodation: "¥280-450/晚", food: "¥120-200/天", transport: "¥50/天", tickets: "¥60-120/天", total: "¥510-820/天" },
    "豪华": { accommodation: "¥700+/晚", food: "¥350+/天", transport: "¥120/天", tickets: "¥120+/天", total: "¥1290+/天" },
  },
  "哈尔滨": {
    "经济": { accommodation: "¥100-200/晚", food: "¥60-100/天", transport: "¥25/天", tickets: "¥100-200/天", total: "¥285-525/天" },
    "中等": { accommodation: "¥300-500/晚", food: "¥150-250/天", transport: "¥50/天", tickets: "¥200-350/天", total: "¥700-1150/天" },
    "豪华": { accommodation: "¥800+/晚", food: "¥400+/天", transport: "¥150/天", tickets: "¥350+/天", total: "¥1700+/天" },
  },
  "拉萨": {
    "经济": { accommodation: "¥100-200/晚", food: "¥60-100/天", transport: "¥50/天", tickets: "¥100-200/天", total: "¥310-550/天" },
    "中等": { accommodation: "¥300-600/晚", food: "¥120-200/天", transport: "¥150/天", tickets: "¥200-350/天", total: "¥770-1300/天" },
    "豪华": { accommodation: "¥1000+/晚", food: "¥350+/天", transport: "¥300/天", tickets: "¥350+/天", total: "¥2000+/天" },
  },
  // 国外
  "巴黎": {
    "经济": { accommodation: "€50-80/晚", food: "€30-50/天", transport: "€15/天", tickets: "€20-40/天", total: "€115-185/天" },
    "中等": { accommodation: "€120-200/晚", food: "€60-100/天", transport: "€25/天", tickets: "€30-50/天", total: "€235-375/天" },
    "豪华": { accommodation: "€300+/晚", food: "€150+/天", transport: "€50/天", tickets: "€50+/天", total: "€550+/天" },
  },
  "东京": {
    "经济": { accommodation: "¥5000-8000/晚", food: "¥3000-5000/天", transport: "¥1500/天", tickets: "¥1000-2000/天", total: "约￥500-800/天" },
    "中等": { accommodation: "¥12000-20000/晚", food: "¥6000-10000/天", transport: "¥2500/天", tickets: "¥2000-4000/天", total: "约￥1100-1800/天" },
    "豪华": { accommodation: "¥35000+/晚", food: "¥15000+/天", transport: "¥5000/天", tickets: "¥5000+/天", total: "约￥3000+/天" },
  },
};
