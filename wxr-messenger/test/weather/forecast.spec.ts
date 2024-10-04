import { getWeatherAsForecast } from '../../src/weather/forecast'
import { getWeather } from '../../src/weather/openmeteo-client'

jest.mock('../../src/weather/openmeteo-client')
const getWeatherMock = getWeather as jest.MockedFunction<typeof getWeather>

describe('forecast.ts', () => {
  describe('getWeatherAsForecast', () => {
    it('returns the weather forecast as an array of messages', async () => {
      getWeatherMock.mockResolvedValue({
        current: {
          temperature2m: 25,
          relativeHumidity2m: 60,
          windSpeed10m: 5,
          windGusts10m: 10,
          precipitation: 5,
        },
        daily: {
          time: [
            new Date('3000-01-01'),
            new Date('3000-01-02'),
            new Date('3000-01-03'),
            new Date('3000-01-04'),
            new Date('3000-01-05'),
            new Date('3000-01-06'),
          ],
          temperature2mMax: [30, 28, 10, 20, 30, 10],
          temperature2mMin: [20, 18, 20, 30, 40, 30],
          windSpeed10mMax: [10, 8, 6, 4, 2, 0],
          windGusts10mMax: [15, 12, 10, 8, 6, 4],
          precipitationProbabilityMax: [50, 40, 30, 20, 10, 0],
        },
      } as any)

      const latitude = 32.9398
      const longitude = -117.2029

      // Test metric output
      {
        const forecast = await getWeatherAsForecast(latitude, longitude, 'metric')

        // Assert the expected weather forecast messages
        expect(getWeatherMock).toHaveBeenCalledWith(latitude, longitude, 'metric')
        expect(forecast).toEqual([
          // First message
          '25°C RH 60% WS 5m/s WG 10m/s 5mm\n' +
            '01-01 30/20 10 15 50%\n' +
            '01-02 28/18 8 12 40%\n' +
            '01-03 10/20 6 10 30%\n' +
            '01-04 20/30 4 8 20%\n' +
            '01-05 30/40 2 6 10%',
          // Second message
          '01-06 10/30 0 4 0%',
        ])
        expect(forecast.forEach((message) => expect(message.length).toBeLessThanOrEqual(140)))
      }

      // Test imperial output
      {
        const forecast = await getWeatherAsForecast(latitude, longitude, 'imperial')

        // Assert the expected weather forecast messages
        expect(getWeatherMock).toHaveBeenCalledWith(latitude, longitude, 'imperial')
        expect(forecast).toEqual([
          // First message
          '25°F RH 60% WS 5mph WG 10mph 5in\n' +
            '01-01 30/20 10 15 50%\n' +
            '01-02 28/18 8 12 40%\n' +
            '01-03 10/20 6 10 30%\n' +
            '01-04 20/30 4 8 20%\n' +
            '01-05 30/40 2 6 10%',
          // Second message
          '01-06 10/30 0 4 0%',
        ])
        expect(forecast.forEach((message) => expect(message.length).toBeLessThanOrEqual(140)))
      }
    })
  })
})
