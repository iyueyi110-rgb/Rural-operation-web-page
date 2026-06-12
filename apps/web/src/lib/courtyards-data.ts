import type { Courtyard } from "@zouma/contracts"

export interface CourtyardOption extends Courtyard {
  nameKey: string
  summaryKey: string
  locationKey: string
  imageAsset: string
  imageAltKey: string
  minNights: number
  updatedAt: string
}

export const bookingDateOptions = [
  { value: "2026-06-20", labelKey: "dates.jun20", status: "available" },
  { value: "2026-06-21", labelKey: "dates.jun21", status: "limited" },
  { value: "2026-06-27", labelKey: "dates.jun27", status: "available" },
  { value: "2026-06-28", labelKey: "dates.jun28", status: "booked" },
] as const

export const guestOptions = [2, 4, 6, 8, 12] as const

export const paymentModeOptions = [
  { value: "deposit", labelKey: "paymentModes.deposit" },
  { value: "full", labelKey: "paymentModes.full" },
] as const

export type PaymentMode = (typeof paymentModeOptions)[number]["value"]

export const courtyardOptions: CourtyardOption[] = [
  {
    id: "ridge-shared-courtyard",
    sceneRealm: "ridge_dwelling",
    capacity: 8,
    inventoryStatus: "available",
    priceLabel: "courtyards.ridgeShared.price",
    amenities: [
      "amenities.sharedKitchen",
      "amenities.courtyardTea",
      "amenities.lowCarbonRoom",
      "amenities.parkingTransfer",
    ],
    bookingNotice: "courtyards.ridgeShared.notice",
    nameKey: "courtyards.ridgeShared.name",
    summaryKey: "courtyards.ridgeShared.summary",
    locationKey: "courtyards.ridgeShared.location",
    imageAsset: "/images/home/courtyard-booking-generated.webp",
    imageAltKey: "courtyards.ridgeShared.imageAlt",
    minNights: 1,
    updatedAt: "2026-06-12",
  },
  {
    id: "lychee-food-courtyard",
    sceneRealm: "lychee_field",
    capacity: 12,
    inventoryStatus: "limited",
    priceLabel: "courtyards.lycheeFood.price",
    amenities: [
      "amenities.foodClassroom",
      "amenities.harvestTable",
      "amenities.familyFriendly",
      "amenities.rainShelter",
    ],
    bookingNotice: "courtyards.lycheeFood.notice",
    nameKey: "courtyards.lycheeFood.name",
    summaryKey: "courtyards.lycheeFood.summary",
    locationKey: "courtyards.lycheeFood.location",
    imageAsset: "/images/home/stone-house.webp",
    imageAltKey: "courtyards.lycheeFood.imageAlt",
    minNights: 0,
    updatedAt: "2026-06-12",
  },
  {
    id: "ancient-road-station",
    sceneRealm: "ancient_road",
    capacity: 6,
    inventoryStatus: "maintenance",
    priceLabel: "courtyards.ancientStation.price",
    amenities: [
      "amenities.audioGuide",
      "amenities.teaBreak",
      "amenities.lightWalk",
      "amenities.historyWall",
    ],
    bookingNotice: "courtyards.ancientStation.notice",
    nameKey: "courtyards.ancientStation.name",
    summaryKey: "courtyards.ancientStation.summary",
    locationKey: "courtyards.ancientStation.location",
    imageAsset: "/images/home/ridge-courtyard.webp",
    imageAltKey: "courtyards.ancientStation.imageAlt",
    minNights: 0,
    updatedAt: "2026-06-12",
  },
]
