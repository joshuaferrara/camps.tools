import { getWeather, Units } from './openmeteo-client'
import { splitStringToMessages } from './utils'

/**
 * Gets the weather and returns a list of messages to send that are less than 140 characters each
 * @param latitude Latitude
 * @param longitude Longitude
 * @param units Units, either 'imperial' or 'metric'; default is 'imperial'.
 */
const getWeatherAsForecast = async (
  latitude: number,
  longitude: number,
  units: Units = 'imperial'
): Promise<string[]> => {
  const weather = await getWeather(latitude, longitude, units as 'imperial' | 'metric')

  const tempUnits = units === 'imperial' ? '°F' : '°C'
  const windSpeedUnits = units === 'imperial' ? 'mph' : 'm/s'
  const precipitationUnits = units === 'imperial' ? 'in' : 'mm'

  // Create the forecast
  let response = ''
  response += `${weather.current.temperature2m.toFixed(0)}${tempUnits} RH ${weather.current.relativeHumidity2m.toFixed(
    0
  )}% WS ${weather.current.windSpeed10m.toFixed(0)}${windSpeedUnits} WG ${weather.current.windGusts10m.toFixed(0)}${windSpeedUnits} ${weather.current.precipitation.toFixed(0)}${precipitationUnits}`
  weather.daily.time.forEach((time, i) => {
    const mnthDayStr = time.toISOString().slice(5, 10)
    const tempHi = weather.daily.temperature2mMax[i]?.toFixed(0)
    const tempLo = weather.daily.temperature2mMin[i]?.toFixed(0)
    const precipitationProbabilityMax = weather.daily.precipitationProbabilityMax[i]?.toFixed(0)
    const windSpeed10mMax = weather.daily.windSpeed10mMax[i]?.toFixed(0)
    const windGusts10mMax = weather.daily.windGusts10mMax[i]?.toFixed(0)
    response += `\n${mnthDayStr} ${tempHi}/${tempLo} ${windSpeed10mMax} ${windGusts10mMax} ${precipitationProbabilityMax}%`
  })

  return splitStringToMessages(response, 140)
}

export { getWeatherAsForecast }
