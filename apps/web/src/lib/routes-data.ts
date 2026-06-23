export type RouteDuration = "halfDay" | "oneDay" | "twoDays"
export type RouteAudience = "senior" | "family" | "regular"
export type RouteWeather = "sunny" | "rainy" | "hot"

export interface RouteOption {
  id: string
  duration: RouteDuration
  audience: RouteAudience
  weather: RouteWeather
  titleKey: string
  summaryKey: string
  totalTimeKey: string
  mobilityKey: string
  weatherKey: string
  waypoints: string[]
  reservationNodes: string[]
  rainFallbackKey: string
  noticeKey: string
}

export const routeOptions: RouteOption[] = [
  {
    id: "gentle-ancient-road",
    duration: "halfDay",
    audience: "senior",
    weather: "sunny",
    titleKey: "plans.gentleAncientRoad.title",
    summaryKey: "plans.gentleAncientRoad.summary",
    totalTimeKey: "plans.gentleAncientRoad.totalTime",
    mobilityKey: "plans.gentleAncientRoad.mobility",
    weatherKey: "plans.gentleAncientRoad.weather",
    waypoints: [
      "waypoints.xikouStation",
      "waypoints.lingwangTeaRoom",
      "waypoints.zoumaCultureCenter",
      "waypoints.integratedServiceCenter",
    ],
    reservationNodes: ["reservationNodes.xikouParking", "reservationNodes.teaRoom"],
    rainFallbackKey: "plans.gentleAncientRoad.rainFallback",
    noticeKey: "plans.gentleAncientRoad.notice",
  },
  {
    id: "family-lychee-class",
    duration: "halfDay",
    audience: "family",
    weather: "sunny",
    titleKey: "plans.familyLycheeClass.title",
    summaryKey: "plans.familyLycheeClass.summary",
    totalTimeKey: "plans.familyLycheeClass.totalTime",
    mobilityKey: "plans.familyLycheeClass.mobility",
    weatherKey: "plans.familyLycheeClass.weather",
    waypoints: [
      "waypoints.xikouStation",
      "waypoints.lijingCoCreationCenter",
      "waypoints.ancientLycheePavilion",
      "waypoints.experienceField",
    ],
    reservationNodes: ["reservationNodes.lycheeWorkshop", "reservationNodes.treeAdoption"],
    rainFallbackKey: "plans.familyLycheeClass.rainFallback",
    noticeKey: "plans.familyLycheeClass.notice",
  },
  {
    id: "regular-four-realms",
    duration: "oneDay",
    audience: "regular",
    weather: "sunny",
    titleKey: "plans.regularFourRealms.title",
    summaryKey: "plans.regularFourRealms.summary",
    totalTimeKey: "plans.regularFourRealms.totalTime",
    mobilityKey: "plans.regularFourRealms.mobility",
    weatherKey: "plans.regularFourRealms.weather",
    waypoints: [
      "waypoints.xikouStation",
      "waypoints.lingwangTeaRoom",
      "waypoints.zoumaCultureCenter",
      "waypoints.researchCenter",
      "waypoints.ecologicalDemoCenter",
      "waypoints.integratedServiceCenter",
    ],
    reservationNodes: ["reservationNodes.serviceCenterMeal", "reservationNodes.researchWorkshop"],
    rainFallbackKey: "plans.regularFourRealms.rainFallback",
    noticeKey: "plans.regularFourRealms.notice",
  },
  {
    id: "rain-study-route",
    duration: "halfDay",
    audience: "family",
    weather: "rainy",
    titleKey: "plans.rainStudyRoute.title",
    summaryKey: "plans.rainStudyRoute.summary",
    totalTimeKey: "plans.rainStudyRoute.totalTime",
    mobilityKey: "plans.rainStudyRoute.mobility",
    weatherKey: "plans.rainStudyRoute.weather",
    waypoints: [
      "waypoints.zoumaCultureCenter",
      "waypoints.integratedServiceCenter",
      "waypoints.researchCenter",
      "waypoints.researchWorkshop",
    ],
    reservationNodes: ["reservationNodes.indoorWorkshop", "reservationNodes.rainGear"],
    rainFallbackKey: "plans.rainStudyRoute.rainFallback",
    noticeKey: "plans.rainStudyRoute.notice",
  },
  {
    id: "hot-low-risk-route",
    duration: "halfDay",
    audience: "senior",
    weather: "hot",
    titleKey: "plans.hotLowRiskRoute.title",
    summaryKey: "plans.hotLowRiskRoute.summary",
    totalTimeKey: "plans.hotLowRiskRoute.totalTime",
    mobilityKey: "plans.hotLowRiskRoute.mobility",
    weatherKey: "plans.hotLowRiskRoute.weather",
    waypoints: [
      "waypoints.xikouStation",
      "waypoints.lingwangTeaRoom",
      "waypoints.integratedServiceCenter",
      "waypoints.viewingPlatform",
    ],
    reservationNodes: ["reservationNodes.teaRoom", "reservationNodes.shuttle"],
    rainFallbackKey: "plans.hotLowRiskRoute.rainFallback",
    noticeKey: "plans.hotLowRiskRoute.notice",
  },
  {
    id: "two-day-courtyard",
    duration: "twoDays",
    audience: "regular",
    weather: "sunny",
    titleKey: "plans.twoDayCourtyard.title",
    summaryKey: "plans.twoDayCourtyard.summary",
    totalTimeKey: "plans.twoDayCourtyard.totalTime",
    mobilityKey: "plans.twoDayCourtyard.mobility",
    weatherKey: "plans.twoDayCourtyard.weather",
    waypoints: [
      "waypoints.xikouStation",
      "waypoints.lijingCoCreationCenter",
      "waypoints.integratedServiceCenter",
      "waypoints.homestayCluster",
      "waypoints.ecologicalDemoCenter",
      "waypoints.researchWorkshop",
    ],
    reservationNodes: ["reservationNodes.serviceCenterStay", "reservationNodes.serviceCenterMeal"],
    rainFallbackKey: "plans.twoDayCourtyard.rainFallback",
    noticeKey: "plans.twoDayCourtyard.notice",
  },
  {
    id: "narrative-six-stops",
    duration: "oneDay",
    audience: "regular",
    weather: "sunny",
    titleKey: "plans.narrativeSixStops.title",
    summaryKey: "plans.narrativeSixStops.summary",
    totalTimeKey: "plans.narrativeSixStops.totalTime",
    mobilityKey: "plans.narrativeSixStops.mobility",
    weatherKey: "plans.narrativeSixStops.weather",
    waypoints: [
      "waypoints.xikouStation",
      "waypoints.lingwangTeaRoom",
      "waypoints.zoumaCultureCenter",
      "waypoints.lijingCoCreationCenter",
      "waypoints.researchCenter",
      "waypoints.ecologicalDemoCenter",
    ],
    reservationNodes: ["reservationNodes.audioGuide", "reservationNodes.serviceCenterMeal", "reservationNodes.researchWorkshop"],
    rainFallbackKey: "plans.narrativeSixStops.rainFallback",
    noticeKey: "plans.narrativeSixStops.notice",
  },
]

const weatherPriority: Record<RouteWeather, number> = {
  sunny: 0,
  rainy: 1,
  hot: 1,
}

export function selectRouteOption(input: {
  duration: RouteDuration
  audience: RouteAudience
  weather: RouteWeather
}) {
  const exact = routeOptions.find(
    (route) =>
      route.duration === input.duration &&
      route.audience === input.audience &&
      route.weather === input.weather,
  )

  if (exact) {
    return exact
  }

  return [...routeOptions].sort((a, b) => {
    const scoreA =
      (a.duration === input.duration ? 0 : 4) +
      (a.audience === input.audience ? 0 : 2) +
      (a.weather === input.weather ? 0 : weatherPriority[input.weather])
    const scoreB =
      (b.duration === input.duration ? 0 : 4) +
      (b.audience === input.audience ? 0 : 2) +
      (b.weather === input.weather ? 0 : weatherPriority[input.weather])

    return scoreA - scoreB
  })[0]
}
