import { S3 } from '@aws-sdk/client-s3'
import { SES } from '@aws-sdk/client-ses'
import PostalMime, { Email, Header } from 'postal-mime'

enum LatitudeLongitude {
  Latitude = 'Latitude',
  Longitude = 'Longitude',
}

/**
 * Find the latitude or longitude in the email headers or body
 * @param key The key to search for in the headers or body
 * @param headers The headers of the email
 * @param body The body of the email
 * @returns The latitude or longitude found in the email
 */
const findLatOrLngInEmailHeadersOrBody = async (
  key: LatitudeLongitude,
  headers: Header[],
  body: string
) => {
  // Look in header
  const paramInHeader = headers.find((header) => header['key'] === `X-SPOT-${key}`.toLowerCase())
  if (paramInHeader?.['value']) {
    return parseFloat(paramInHeader['value'])
  }

  // If the header is not present, try to find it in in the body
  const paramInBody = RegExp(`${key}: (-*[0-9.]+)`).exec(body)
  if (paramInBody !== null && paramInBody.length > 1 && paramInBody[1]) {
    return parseFloat(paramInBody[1])
  }

  return null
}

/**
 * Find the latitude and longitude in the email
 * @param headers The headers of the email
 * @param body The body of the email
 * @returns The latitude and longitude found in the email
 */
const findLatLngInEmail = async (headers: Header[], body: string) => {
  return {
    latitude: await findLatOrLngInEmailHeadersOrBody(LatitudeLongitude.Latitude, headers, body),
    longitude: await findLatOrLngInEmailHeadersOrBody(LatitudeLongitude.Longitude, headers, body),
  }
}

/**
 * Get the email from the S3 bucket by message ID
 * @param messageId The message ID of the email
 * @returns The parsed email, or undefined if the email is not found
 */
const getEmailFromS3ByMessageId = async (bucket: string, messageId: string) => {
  const s3 = new S3()

  let emailObj
  try {
    emailObj = await s3.getObject({ Bucket: bucket, Key: messageId })
  } catch (error) {
    console.error(`Failed to get S3 object bucket=${bucket} key=${messageId} error=${error}`)
    return
  }

  const emailBody = emailObj.Body
  if (!emailBody) {
    console.error(`Email is empty bucket=${bucket} key=${messageId}`)
    return
  }

  const emailBodyString = await emailBody.transformToString()
  const email = await PostalMime.parse(emailBodyString)
  return email
}

/**
 * Expire an email by deleting it from the S3 bucket
 * @param bucket Bucket name
 * @param messageId Message ID of the email
 */
const expireEmailInS3 = async (bucket: string, messageId: string) => {
  try {
    const s3 = new S3()
    await s3.deleteObject({ Bucket: bucket, Key: messageId })
    console.log(`Expired S3 object bucket=${bucket} key=${messageId}`)
  } catch (error) {
    console.error(`Failed to expire S3 object bucket=${bucket} key=${messageId}`)
  }
}

/**
 * Respond to an email
 * @param email The email to respond to
 * @param sendTo The email address to send the response to
 * @param from The email address to send the response from
 * @param responseBody The body of the response email
 * @returns The raw email that was sent
 */
const replyToEmail = async (
  email: Email,
  sendTo: string,
  from: string | undefined,
  responseBody: string
) => {
  const ses = new SES()
  const headersIn = email.headers
  const messageIdHeader = headersIn.find((header) => header.key === 'message-id')?.value
  const headersOut = [
    `To: ${sendTo}`,
    `From: ${from}`,
    `Subject: ${email?.subject ?? ''}`,
    `References: ${messageIdHeader}`,
    `In-Reply-To: ${messageIdHeader}`,
  ]
  const rawEmail = headersOut.join('\r\n') + '\r\n\r\n' + responseBody
  const params = {
    Destinations: [sendTo],
    RawMessage: {
      Data: Buffer.from(rawEmail),
    },
  }
  await ses.sendRawEmail(params)
  return rawEmail
}

export { expireEmailInS3, findLatLngInEmail, getEmailFromS3ByMessageId, replyToEmail }
