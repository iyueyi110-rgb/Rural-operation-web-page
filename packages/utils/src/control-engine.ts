export interface ControlSensorInput {
  sensorId: string
  type: string
  value: number
  unit: string
  nodeId?: string | null
}

export interface ControlSuggestion {
  type: "irrigation" | "flood_alert" | "fire_alert" | "rain_delay"
  priority: "critical" | "high" | "medium" | "low"
  reason: string
  targetNodeId?: string
  payload?: Record<string, unknown>
  triggeredBy: "rule_engine"
}

const SOIL_MOISTURE_LOW = 30
const SOIL_MOISTURE_WET = 60
const WATER_LEVEL_HIGH = 2.2
const TEMPERATURE_FIRE_RISK = 35
const HUMIDITY_FIRE_RISK = 20

function latestByType(sensors: ControlSensorInput[], type: string) {
  return sensors.find((sensor) => sensor.type === type)
}

export function computeControlSuggestions({
  sensors,
  forecastText = "",
}: {
  sensors: ControlSensorInput[]
  forecastText?: string
}): ControlSuggestion[] {
  const suggestions: ControlSuggestion[] = []
  const soilMoisture = latestByType(sensors, "soil_moisture")
  const waterLevel = latestByType(sensors, "water_level")
  const temperature = latestByType(sensors, "temperature")
  const humidity = latestByType(sensors, "humidity")
  const forecastRain = /雨|rain/i.test(forecastText)

  if (soilMoisture && soilMoisture.value < SOIL_MOISTURE_LOW && !forecastRain) {
    suggestions.push({
      type: "irrigation",
      priority: "high",
      reason: `土壤湿度 ${soilMoisture.value}${soilMoisture.unit} 低于 ${SOIL_MOISTURE_LOW}%，且近期无降雨信号，建议安排补水。`,
      targetNodeId: soilMoisture.nodeId ?? undefined,
      payload: { sensorId: soilMoisture.sensorId, value: soilMoisture.value },
      triggeredBy: "rule_engine",
    })
  }

  if (waterLevel && waterLevel.value > WATER_LEVEL_HIGH) {
    suggestions.push({
      type: "flood_alert",
      priority: "critical",
      reason: `水位 ${waterLevel.value}${waterLevel.unit} 高于 ${WATER_LEVEL_HIGH}m 阈值，建议巡查临水节点并准备雨洪提示。`,
      targetNodeId: waterLevel.nodeId ?? undefined,
      payload: { sensorId: waterLevel.sensorId, value: waterLevel.value },
      triggeredBy: "rule_engine",
    })
  }

  if (temperature && humidity && temperature.value > TEMPERATURE_FIRE_RISK && humidity.value < HUMIDITY_FIRE_RISK) {
    suggestions.push({
      type: "fire_alert",
      priority: "high",
      reason: `温度 ${temperature.value}${temperature.unit} 且湿度 ${humidity.value}${humidity.unit}，达到高温低湿火险条件。`,
      targetNodeId: temperature.nodeId ?? humidity.nodeId ?? undefined,
      payload: { temperature: temperature.value, humidity: humidity.value },
      triggeredBy: "rule_engine",
    })
  }

  if (soilMoisture && soilMoisture.value > SOIL_MOISTURE_WET && forecastRain) {
    suggestions.push({
      type: "rain_delay",
      priority: "medium",
      reason: `土壤湿度 ${soilMoisture.value}${soilMoisture.unit} 已较高且存在降雨信号，建议延后灌溉或采摘。`,
      targetNodeId: soilMoisture.nodeId ?? undefined,
      payload: { sensorId: soilMoisture.sensorId, value: soilMoisture.value },
      triggeredBy: "rule_engine",
    })
  }

  return suggestions
}
