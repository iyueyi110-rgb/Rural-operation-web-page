import {
  BarChart3,
  Bell,
  Bot,
  CalendarDays,
  ClipboardList,
  Cpu,
  FileText,
  LayoutDashboard,
  Lightbulb,
  ListChecks,
  Map,
  MapPin,
  RadioTower,
  Settings,
  ShoppingCart,
  Sprout,
  Store,
  Sunrise,
  Trees,
  Users,
  WandSparkles,
} from "lucide-react"
import type { ComponentType } from "react"

export type AdminNavGroupKey = "command" | "fieldOps" | "assetsCommerce" | "villageWork" | "aiSystem"

export interface AdminNavItem {
  key: string
  label: string
  href: string
  description: string
  group: AdminNavGroupKey
  icon: ComponentType<{ className?: string }>
}

export interface AdminNavGroup {
  key: AdminNavGroupKey
  label: string
  description: string
}

export const adminNavGroups: AdminNavGroup[] = [
  {
    key: "command",
    label: "指挥台",
    description: "总览、智策与日报",
  },
  {
    key: "fieldOps",
    label: "现场运营",
    description: "地图、告警、反馈与分析",
  },
  {
    key: "assetsCommerce",
    label: "资产与交易",
    description: "节点、树木、产品与预约",
  },
  {
    key: "villageWork",
    label: "村民协作",
    description: "村民、农事与任务调度",
  },
  {
    key: "aiSystem",
    label: "AI 与系统",
    description: "内容、设备、设施与设置",
  },
]

export const defaultAdminNavGroup = adminNavGroups[0] as AdminNavGroup

export const adminNavItems: AdminNavItem[] = [
  {
    key: "dashboard",
    label: "云脑总览",
    href: "/dashboard",
    description: "五流运营态势",
    group: "command",
    icon: LayoutDashboard,
  },
  {
    key: "recommendations",
    label: "智策中心",
    href: "/admin/recommendations",
    description: "建议审核与执行",
    group: "command",
    icon: Lightbulb,
  },
  {
    key: "reports",
    label: "运营日报",
    href: "/reports",
    description: "日报生成与行动项",
    group: "command",
    icon: FileText,
  },
  {
    key: "map",
    label: "地图监控",
    href: "/map",
    description: "空间节点实时态势",
    group: "fieldOps",
    icon: Map,
  },
  {
    key: "alerts",
    label: "告警中心",
    href: "/alerts",
    description: "行为、传感与天气告警",
    group: "fieldOps",
    icon: Bell,
  },
  {
    key: "feedback",
    label: "反馈管理",
    href: "/feedback",
    description: "游客反馈工单",
    group: "fieldOps",
    icon: ClipboardList,
  },
  {
    key: "analytics",
    label: "交叉分析",
    href: "/analytics",
    description: "客流与消费转化",
    group: "fieldOps",
    icon: BarChart3,
  },
  {
    key: "nodes",
    label: "节点管理",
    href: "/nodes",
    description: "空间节点档案",
    group: "assetsCommerce",
    icon: MapPin,
  },
  {
    key: "trees",
    label: "树木管理",
    href: "/trees",
    description: "认养树与养护日志",
    group: "assetsCommerce",
    icon: Trees,
  },
  {
    key: "products",
    label: "农产品管理",
    href: "/products",
    description: "产品台账与库存",
    group: "assetsCommerce",
    icon: Store,
  },
  {
    key: "orders",
    label: "消费订单",
    href: "/orders",
    description: "统一订单与收入",
    group: "assetsCommerce",
    icon: ShoppingCart,
  },
  {
    key: "harvest",
    label: "采摘管理",
    href: "/harvest",
    description: "采摘预约排期",
    group: "assetsCommerce",
    icon: Sprout,
  },
  {
    key: "activities",
    label: "活动管理",
    href: "/activities",
    description: "活动与预约列表",
    group: "assetsCommerce",
    icon: CalendarDays,
  },
  {
    key: "villagers",
    label: "村民管理",
    href: "/villagers",
    description: "村民档案与技能",
    group: "villageWork",
    icon: Users,
  },
  {
    key: "farming",
    label: "农事日历",
    href: "/farming",
    description: "节气农事安排",
    group: "villageWork",
    icon: Sunrise,
  },
  {
    key: "tasks",
    label: "任务调度",
    href: "/tasks",
    description: "任务分配与收益",
    group: "villageWork",
    icon: ListChecks,
  },
  {
    key: "contentFactory",
    label: "内容工厂",
    href: "/content-factory",
    description: "导览词与活动脚本",
    group: "aiSystem",
    icon: WandSparkles,
  },
  {
    key: "aiAssistant",
    label: "AI 助手",
    href: "/ai-assistant",
    description: "自然语言运营查询",
    group: "aiSystem",
    icon: Bot,
  },
  {
    key: "devices",
    label: "设备管理",
    href: "/devices",
    description: "IoT 设备台账",
    group: "aiSystem",
    icon: RadioTower,
  },
  {
    key: "infrastructure",
    label: "设施调度",
    href: "/infrastructure",
    description: "传感器与控制指令",
    group: "aiSystem",
    icon: Cpu,
  },
  {
    key: "settings",
    label: "系统设置",
    href: "/settings",
    description: "接口、数据库与环境",
    group: "aiSystem",
    icon: Settings,
  },
]

export function getAdminNavGroup(pathname: string) {
  const current = getAdminNavItem(pathname)
  return current ? (adminNavGroups.find((group) => group.key === current.group) ?? defaultAdminNavGroup) : defaultAdminNavGroup
}

export function getAdminNavItem(pathname: string) {
  return adminNavItems.find((item) => isAdminNavItemActive(pathname, item)) ?? null
}

export function getAdminNavItemsForGroup(groupKey: AdminNavGroupKey) {
  return adminNavItems.filter((item) => item.group === groupKey)
}

export function isAdminNavItemActive(pathname: string, item: AdminNavItem) {
  if (item.href === "/dashboard") {
    return pathname === "/" || pathname === item.href
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}
