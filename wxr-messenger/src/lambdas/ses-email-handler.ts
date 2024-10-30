import type { SESEvent } from 'aws-lambda'
import { isEmailTimedOut } from '../email/bouncer'
import {
  expireEmailInS3,
  findLatLngInEmail,
  getEmailFromS3ByMessageId,
  replyToEmail,
} from '../email/emails'
import { getWeatherAsForecast } from '../weather/forecast'

const BUCKET = process.env.BUCKET_NAME ?? ''

const sesEmailHandler = async (event: SESEvent) => {
  // Check for records in the event
  if (!event.Records || event.Records.length === 0) {
    console.error('No records found in SESEvent')
    return
  }

  // Get the message ID
  const message = event.Records[0]?.ses.mail
  const messageId = message?.messageId
  if (!messageId) {
    console.error('No messageId found in SESEvent')
    return
  }

  try {
    // Download the email from S3 bucket
    const email = await getEmailFromS3ByMessageId(BUCKET, messageId)
    if (!email) {
      console.error(`Email not found in S3 bucket messageID=${messageId}`)
      return
    }

    // Only respond to emails from the SPOT service
    const receiverEmail = email?.to?.[0]?.address
    const isDebug = receiverEmail?.includes('debug')
    if (isDebug) {
      console.log(JSON.stringify(email, null, 2))
    }

    const senderEmail = email?.from.address
    if (
      !senderEmail ||
      (!senderEmail.includes('@findmespot.com') &&
        !senderEmail.includes('@textmyspotx.com') &&
        senderEmail !== 'scjosh2@gmail.com')
    ) {
      console.log(`Ignoring email from non-allow-listed senderEmail=${senderEmail}`)
      return
    }

    // Check if email address is in time out
    if (await isEmailTimedOut(senderEmail)) {
      console.log(`Ignoring email from timed out senderEmail=${senderEmail}`)
      return
    }

    // Only respond to emails with lat/lng
    const latLng = await findLatLngInEmail(email.headers, email.text ?? '')
    if (!latLng.latitude || !latLng.longitude) {
      console.log('Ignoring email without position report')
      return
    }

    // Determine the units from the email address
    const units = receiverEmail?.indexOf('imp') !== -1 ? 'imperial' : 'metric'

    // Get the weather
    let weatherMessages = await getWeatherAsForecast(latLng.latitude, latLng.longitude, units)
    if (isDebug) {
      console.log(
        `Sending ${weatherMessages.length} messages to ${senderEmail} from ${receiverEmail}`
      )
      console.log(JSON.stringify(weatherMessages, null, 2))
    }

    // Send responses
    email.subject = '' // Clear the subject as it counts against the 140 character limit
    for (const curMessage of weatherMessages) {
      const rawEmailOut = await replyToEmail(
        email,
        senderEmail,
        `${receiverEmail} <${receiverEmail}>`,
        curMessage
      )
      if (isDebug) {
        console.log(JSON.stringify(rawEmailOut, null, 2))
      }
    }
    console.log('Email sent successfully')
  } catch (error) {
    console.error('Error processing email:', error)
  } finally {
    await expireEmailInS3(BUCKET, messageId)
  }
  console.log('Email processing complete')
}

export default sesEmailHandler
