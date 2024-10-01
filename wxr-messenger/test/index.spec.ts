import { SESEvent } from 'aws-lambda'
import 'aws-sdk-client-mock-jest'
import { findLatLngInEmail, getEmailFromS3ByMessageId, replyToEmail } from '../src/emails'
import { getWeatherAsForecast } from '../src/forecast'
import { handler } from '../src/index'

jest.mock('../src/emails')
jest.mock('../src/forecast')
const mockedGetEmailByMessageId = getEmailFromS3ByMessageId as jest.MockedFunction<
  typeof getEmailFromS3ByMessageId
>
const mockedFindLatLng = findLatLngInEmail as jest.MockedFunction<typeof findLatLngInEmail>
const mockedReplyToEmail = replyToEmail as jest.MockedFunction<typeof replyToEmail>
const mockedGetWeatherAsForecast = getWeatherAsForecast as jest.MockedFunction<
  typeof getWeatherAsForecast
>

describe('handler', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should log an error when no records are found', async () => {
    const event: SESEvent = { Records: [] }
    console.error = jest.fn()

    await handler(event)

    expect(console.error).toHaveBeenCalledWith('No records found in SESEvent')
  })

  it('should log an error when no messageId is found', async () => {
    const event: SESEvent = { Records: [{ ses: { mail: {} } }] } as any
    console.error = jest.fn()

    await handler(event)

    expect(console.error).toHaveBeenCalledWith('No messageId found in SESEvent')
  })

  it('should log an error when email is not found in S3 bucket', async () => {
    const event: SESEvent = { Records: [{ ses: { mail: { messageId: '123' } } }] } as any
    mockedGetEmailByMessageId.mockResolvedValue(undefined)
    console.error = jest.fn()

    await handler(event)

    expect(console.error).toHaveBeenCalledWith('Email not found in S3 bucket messageID=123')
  })

  it('should log when email is from a non-allow-listed sender', async () => {
    const event: SESEvent = { Records: [{ ses: { mail: { messageId: '123' } } }] } as any
    mockedGetEmailByMessageId.mockResolvedValue({
      from: { address: 'test@example.com' },
      to: [{ address: 'fcst@wxr.tools' }],
    } as any)
    console.log = jest.fn()

    await handler(event)

    expect(console.log).toHaveBeenCalledWith(
      "Ignoring email from non-allow-listed sender: 'test@example.com'"
    )
  })

  it('should log when email does not contain lat/lng', async () => {
    const event: SESEvent = { Records: [{ ses: { mail: { messageId: '123' } } }] } as any
    mockedGetEmailByMessageId.mockResolvedValue({
      from: { address: 'test@findmespot.com' },
      to: [{ address: 'fcst@wxr.tools' }],
      headers: {},
      text: '',
    } as any)
    mockedFindLatLng.mockResolvedValue({ latitude: null, longitude: null })
    console.log = jest.fn()

    await handler(event)

    expect(console.log).toHaveBeenCalledWith('Ignoring email without position report')
  })

  it('should proceed when all conditions are met', async () => {
    const event: SESEvent = { Records: [{ ses: { mail: { messageId: '123' } } }] } as any
    mockedGetEmailByMessageId.mockResolvedValue({
      from: { address: 'test@findmespot.com' },
      to: [{ address: 'fcst@wxr.tools' }],
      headers: [{ key: 'message-id', value: '123' }],
      text: 'message body',
      subject: 'test subject',
    } as any)
    mockedFindLatLng.mockResolvedValue({ latitude: 10, longitude: 20 })
    mockedGetWeatherAsForecast.mockResolvedValue(['test', 'test2'])
    console.log = jest.fn()

    await handler(event)

    expect(console.log).toHaveBeenCalledWith('Email sent successfully')
    expect(mockedGetEmailByMessageId).toHaveBeenCalledWith('', '123')
    expect(mockedFindLatLng).toHaveBeenCalledWith(expect.any(Array), 'message body')
    expect(mockedGetWeatherAsForecast).toHaveBeenCalledWith(10, 20, 'metric')
    expect(mockedReplyToEmail).toHaveBeenCalledWith(
      expect.anything(),
      'test@findmespot.com',
      'wxr.tools <fcst@wxr.tools>',
      'test'
    )
    expect(mockedReplyToEmail).toHaveBeenCalledWith(
      expect.anything(),
      'test@findmespot.com',
      'wxr.tools <fcst@wxr.tools>',
      'test2'
    )
  })

  it('should get units from sentTo email', async () => {
    const event: SESEvent = { Records: [{ ses: { mail: { messageId: '123' } } }] } as any
    mockedGetEmailByMessageId.mockResolvedValue({
      from: { address: 'test@findmespot.com' },
      to: [{ address: 'fcst+imp@wxr.tools' }],
      headers: [{ key: 'message-id', value: '123' }],
      text: 'message body',
      subject: 'test subject',
    } as any)
    mockedFindLatLng.mockResolvedValue({ latitude: 10, longitude: 20 })
    mockedGetWeatherAsForecast.mockResolvedValue(['test', 'test2'])
    console.log = jest.fn()

    await handler(event)

    expect(console.log).toHaveBeenCalledWith('Email sent successfully')
    expect(mockedGetEmailByMessageId).toHaveBeenCalledWith('', '123')
    expect(mockedFindLatLng).toHaveBeenCalledWith(expect.any(Array), 'message body')
    expect(mockedGetWeatherAsForecast).toHaveBeenCalledWith(10, 20, 'imperial')
    expect(mockedReplyToEmail).toHaveBeenCalledWith(
      expect.anything(),
      'test@findmespot.com',
      'wxr.tools <fcst+imp@wxr.tools>',
      'test'
    )
    expect(mockedReplyToEmail).toHaveBeenCalledWith(
      expect.anything(),
      'test@findmespot.com',
      'wxr.tools <fcst+imp@wxr.tools>',
      'test2'
    )
  })

  it('should log an error when an error occurs', async () => {
    const event: SESEvent = { Records: [{ ses: { mail: { messageId: '123' } } }] } as any
    mockedGetEmailByMessageId.mockResolvedValue({
      from: { address: 'test@findmespot.com' },
      to: [{ address: 'fcst@wxr.tools' }],
      headers: [{ key: 'message-id', value: '123' }],
      text: 'message body',
      subject: 'test subject',
    } as any)
    mockedGetEmailByMessageId.mockRejectedValue('Error')
    console.error = jest.fn()

    await handler(event)

    expect(console.error).toHaveBeenCalledWith('Error processing email:', 'Error')
  })
})
