import { DeleteObjectCommand, GetObjectCommand, S3 } from '@aws-sdk/client-s3'
import { SendRawEmailCommand, SES } from '@aws-sdk/client-ses'
import { sdkStreamMixin } from '@smithy/util-stream'
import { mockClient } from 'aws-sdk-client-mock'
import 'aws-sdk-client-mock-jest'
import { Readable } from 'node:stream'
import { Email, Header } from 'postal-mime'
import {
  expireEmailInS3,
  findLatLngInEmail,
  getEmailFromS3ByMessageId,
  replyToEmail,
} from '../../src/email/emails'
import PostalMime from '../postal-mime-stub'

const s3Mock = mockClient(S3)
const sesMock = mockClient(SES)

jest.mock('postal-mime')
const mockedPostalMime = PostalMime as jest.MockedClass<typeof PostalMime>

describe('emails.ts', () => {
  describe('findLatLng', () => {
    it('null when lat/lng not found', async () => {
      const bodyText = `Device Name: Josh <br> Latitude:  <br> Longitude:  <br> Altitude: 113.0 m  | 371 ft <br> GPS location Date/Time: 02/08/2022 14:13:28 CST <br><br> Message: This is the default SPOT Check In message. Please update.<br><br> Click the link below to see where I am located. <br> <a href=http://fms.ws/1cMEUc/80.90N/117.22191W > http://fms.ws/1cMEUc/80.90N/117.22191W <a /><br><br> If the above link does not work, try this link: <br> <a href=http://maps.google.com/maps?f=q&hl=en&geocode=&q=80.90,-120.301122&ll=80.90,-120.301122&ie=UTF8&z=12&om=1 > http://maps.google.com/maps?f=q&hl=en&geocode=&q=80.90,-120.301122&ll=80.90,-120.301122&ie=UTF8&z=12&om=1 <a/><br><br> You have received this message because "Josh" has added you to its SPOT contact list and attempted to contact you.<br><br> FindMeSPOT.com`
      const latLng = await findLatLngInEmail([], bodyText)
      expect(latLng).toEqual({ latitude: null, longitude: null })
    })

    it('finds latitude/longitude in body', async () => {
      const bodyText = `Device Name: Josh <br> Latitude: 80.90 <br> Longitude: -120.301122 <br> Altitude: 113.0 m  | 371 ft <br> GPS location Date/Time: 02/08/2022 14:13:28 CST <br><br> Message: This is the default SPOT Check In message. Please update.<br><br> Click the link below to see where I am located. <br> <a href=http://fms.ws/1cMEUc/80.90N/117.22191W > http://fms.ws/1cMEUc/80.90N/117.22191W <a /><br><br> If the above link does not work, try this link: <br> <a href=http://maps.google.com/maps?f=q&hl=en&geocode=&q=80.90,-120.301122&ll=80.90,-120.301122&ie=UTF8&z=12&om=1 > http://maps.google.com/maps?f=q&hl=en&geocode=&q=80.90,-120.301122&ll=80.90,-120.301122&ie=UTF8&z=12&om=1 <a/><br><br> You have received this message because "Josh" has added you to its SPOT contact list and attempted to contact you.<br><br> FindMeSPOT.com`
      const latLng = await findLatLngInEmail([], bodyText)
      expect(latLng).toEqual({ latitude: 80.9, longitude: -120.301122 })
    })

    it('finds latitude/longitude in headers', async () => {
      const bodyText = `Device Name: Josh <br> Latitude:  <br> Longitude:  <br> Altitude: 113.0 m  | 371 ft <br> GPS location Date/Time: 02/08/2022 14:13:28 CST <br><br> Message: This is the default SPOT Check In message. Please update.<br><br> Click the link below to see where I am located. <br> <a href=http://fms.ws/1cMEUc/80.90N/117.22191W > http://fms.ws/1cMEUc/80.90N/117.22191W <a /><br><br> If the above link does not work, try this link: <br> <a href=http://maps.google.com/maps?f=q&hl=en&geocode=&q=80.90,-120.301122&ll=80.90,-120.301122&ie=UTF8&z=12&om=1 > http://maps.google.com/maps?f=q&hl=en&geocode=&q=80.90,-120.301122&ll=80.90,-120.301122&ie=UTF8&z=12&om=1 <a/><br><br> You have received this message because "Josh" has added you to its SPOT contact list and attempted to contact you.<br><br> FindMeSPOT.com`
      const headers: Header[] = [
        {
          key: 'x-spot-latitude',
          value: '80.9',
        },
        {
          key: 'x-spot-longitude',
          value: '-120.301122',
        },
      ]

      const latLng = await findLatLngInEmail(headers, bodyText)
      expect(latLng).toEqual({ latitude: 80.9, longitude: -120.301122 })
    })
  })

  describe('expireEmail', () => {
    const bucket = 'test-bucket'
    const messageId = 'test-message-id'

    beforeEach(() => {
      jest.resetAllMocks()
    })

    it('should call deleteObject with correct parameters', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
      await expireEmailInS3(bucket, messageId)
      expect(consoleLogSpy).toHaveBeenCalledWith(
        `Expired S3 object bucket=${bucket} key=${messageId}`
      )
      expect(s3Mock).toHaveReceivedCommandWith(DeleteObjectCommand, {
        Bucket: expect.stringMatching(bucket),
        Key: expect.stringMatching(messageId),
      })
      consoleLogSpy.mockRestore()
    })

    it('should log an error if deleteObject fails', async () => {
      s3Mock.on(DeleteObjectCommand).rejects('Delete object error')
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      await expireEmailInS3(bucket, messageId)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `Failed to expire S3 object bucket=${bucket} key=${messageId}`
      )
      expect(s3Mock).toHaveReceivedCommandWith(DeleteObjectCommand, {
        Bucket: expect.stringMatching(bucket),
        Key: expect.stringMatching(messageId),
      })
      consoleErrorSpy.mockRestore()
    })
  })

  describe('getEmailByMessageId', () => {
    it('parses the email when its found', async () => {
      // create Stream from string
      const stream = new Readable()
      stream.push('hello world')
      stream.push(null)
      const sdkStream = sdkStreamMixin(stream)
      s3Mock.on(GetObjectCommand).resolves({
        Body: sdkStream as any,
      })

      await getEmailFromS3ByMessageId('test-bucket', 'test-message-id')
      expect(s3Mock).toHaveReceivedCommandWith(GetObjectCommand, {
        Bucket: 'test-bucket',
        Key: 'test-message-id',
      })
      expect(mockedPostalMime.parse).toHaveBeenCalledWith('hello world')
    })

    it('returns undefined when email is not found', async () => {
      s3Mock.on(GetObjectCommand).rejects('Get object error')
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      await getEmailFromS3ByMessageId('test-bucket', 'test-message-id')
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to get S3 object bucket=test-bucket key=test-message-id error=Error: Get object error'
      )
      consoleErrorSpy.mockRestore()
    })

    it('returns undefined when email body is empty', async () => {
      s3Mock.on(GetObjectCommand).resolves({
        Body: undefined,
      })
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      await getEmailFromS3ByMessageId('test-bucket', 'test-message-id')
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Email is empty bucket=test-bucket key=test-message-id'
      )
      consoleErrorSpy.mockRestore()
    })
  })

  describe('replyToEmail', () => {
    it('should send email', async () => {
      const mockEmail: Email = {
        headers: [{ key: 'message-id', value: '123' }],
        subject: 'test subject',
        from: {
          name: 'sender@gmail.com',
          address: undefined,
          group: undefined,
        },
        messageId: '123',
        attachments: [],
      }

      await replyToEmail(mockEmail as any, 'sendTo@gmail.com', 'from@gmail.com', 'test body')

      expect(sesMock).toHaveReceivedCommandTimes(SendRawEmailCommand, 1)
      const sendRawEmailParams = sesMock.commandCalls(SendRawEmailCommand)[0]?.args[0]
      const rawEmailText = sendRawEmailParams?.input.RawMessage?.Data?.toString()
      expect(rawEmailText).not.toBeUndefined()
      expect(rawEmailText).toContain('To: sendTo@gmail.com')
      expect(rawEmailText).toContain('From: from@gmail.com')
      expect(rawEmailText).toContain('Subject: test subject')
      expect(rawEmailText).toContain('References: 123')
      expect(rawEmailText).toContain('In-Reply-To: 123')
      expect(rawEmailText).toContain('test body')
    })
  })
})
