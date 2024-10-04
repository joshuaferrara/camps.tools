import { fetchWeatherApi } from 'openmeteo'

export type Units = 'imperial' | 'metric'

// Auto generated from https://open-meteo.com/en/docs with modification to support units
const getWeather = async (latitude: number, longitude: number, units: Units = 'imperial') => {
  let params: any = {
    latitude,
    longitude,
    current: [
      'temperature_2m',
      'relative_humidity_2m',
      'precipitation',
      'wind_speed_10m',
      'wind_gusts_10m',
    ],
    hourly: 'temperature_2m',
    daily: [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'sunrise',
      'sunset',
      'uv_index_max',
      'precipitation_sum',
      'precipitation_hours',
      'precipitation_probability_max',
      'wind_speed_10m_max',
      'wind_gusts_10m_max',
      'wind_direction_10m_dominant',
    ],
    timezone: 'auto',
    forecast_days: 3,
  }

  // Modification to support units
  if (units === 'imperial') {
    params['temperature_unit'] = 'fahrenheit'
    params['wind_speed_unit'] = 'mph'
    params['precipitation_unit'] = 'inch'
  }

  const url = 'https://api.open-meteo.com/v1/forecast'
  const responses = await fetchWeatherApi(url, params)

  const range = (start: number, stop: number, step: number) =>
    Array.from({ length: (stop - start) / step }, (_, i) => start + i * step)
  const response = responses[0]
  if (response === undefined) {
    throw new Error('No response from weather API')
  }

  const utcOffsetSeconds = response.utcOffsetSeconds()
  const timezone = response.timezone()
  const timezoneAbbreviation = response.timezoneAbbreviation()

  const current = response.current()!
  const hourly = response.hourly()!
  const daily = response.daily()!

  const weatherData = {
    timezone,
    timezoneAbbreviation,
    current: {
      time: new Date((Number(current.time()) + utcOffsetSeconds) * 1000),
      temperature2m: current.variables(0)!.value(),
      relativeHumidity2m: current.variables(1)!.value(),
      precipitation: current.variables(2)!.value(),
      windSpeed10m: current.variables(3)!.value(),
      windGusts10m: current.variables(4)!.value(),
    },
    hourly: {
      time: range(Number(hourly.time()), Number(hourly.timeEnd()), hourly.interval()).map(
        (t) => new Date((t + utcOffsetSeconds) * 1000)
      ),
      temperature2m: hourly.variables(0)!.valuesArray()!,
    },
    daily: {
      time: range(Number(daily.time()), Number(daily.timeEnd()), daily.interval()).map(
        (t) => new Date((t + utcOffsetSeconds) * 1000)
      ),
      weatherCode: daily.variables(0)!.valuesArray()!,
      temperature2mMax: daily.variables(1)!.valuesArray()!,
      temperature2mMin: daily.variables(2)!.valuesArray()!,
      sunrise: daily.variables(3)!.valuesArray()!,
      sunset: daily.variables(4)!.valuesArray()!,
      uvIndexMax: daily.variables(5)!.valuesArray()!,
      precipitationSum: daily.variables(6)!.valuesArray()!,
      precipitationHours: daily.variables(7)!.valuesArray()!,
      precipitationProbabilityMax: daily.variables(8)!.valuesArray()!,
      windSpeed10mMax: daily.variables(9)!.valuesArray()!,
      windGusts10mMax: daily.variables(10)!.valuesArray()!,
      windDirection10mDominant: daily.variables(11)!.valuesArray()!,
    },
  }

  return weatherData
}

export { getWeather }
