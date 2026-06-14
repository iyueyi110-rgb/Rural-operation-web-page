import { prisma } from "../src/index"

const seedProductData = [
  {
    id: "lychee-gift-box",
    name: "走马荔枝礼盒",
    category: "fresh",
    description: "结合荔枝鲜果、村落故事卡和认养树回访权益的季节礼盒。",
    price: 168,
    unit: "盒",
    stockStatus: "seasonal",
    nodeSlug: "lychee-garden",
  },
  {
    id: "orchard-dried-fruit",
    name: "果园风味果干",
    category: "processed",
    description: "由村内果林资源加工的小份伴手礼，适合门票和研学订单加购。",
    price: 39,
    unit: "袋",
    stockStatus: "available",
    nodeSlug: "village-meal",
  },
  {
    id: "ridge-meal-set",
    name: "岭上村宴预订",
    category: "meal",
    description: "面向院落和路线游客的村宴占位产品，当前仅生成线下确认单。",
    price: null,
    unit: "桌",
    stockStatus: "reservation",
    nodeSlug: "village-meal",
  },
]

export async function seedProducts() {
  for (const product of seedProductData) {
    const node = await prisma.spaceNode.findUnique({ where: { slug: product.nodeSlug } })

    await prisma.product.upsert({
      where: { id: product.id },
      create: {
        id: product.id,
        name: product.name,
        category: product.category,
        description: product.description,
        price: product.price,
        unit: product.unit,
        stockStatus: product.stockStatus,
        nodeId: node?.id,
        status: "active",
      },
      update: {
        name: product.name,
        category: product.category,
        description: product.description,
        price: product.price,
        unit: product.unit,
        stockStatus: product.stockStatus,
        nodeId: node?.id,
        status: "active",
      },
    })
  }
}
