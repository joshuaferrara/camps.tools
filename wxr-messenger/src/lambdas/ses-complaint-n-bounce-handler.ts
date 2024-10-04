import { SNSEvent } from 'aws-lambda'
import { timeoutEmail } from '../email/bouncer'

/**
 * SES Complaint and Bounce Handler Lambda
 * @param event Event from SNS
 */
const sesComplaintAndBounceHandler = async (event: SNSEvent) => {
  for (const record of event.Records) {
    const snsMessageJson = record.Sns.Message
    const snsMessage = JSON.parse(snsMessageJson) as SESCommonNotification
    await processSnsMessage(snsMessage)
  }
}

/**
 * Process the SNS message and pass it to the appropriate handler
 * @param snsMessage The parsed SNS message
 */
const processSnsMessage = async (snsMessage: SESCommonNotification) => {
  switch (snsMessage.notificationType) {
    case 'Bounce':
      await handleBounceNotification(snsMessage as SESBounceNotification)
      break
    case 'Complaint':
      await handleComplaintNotification(snsMessage as SESComplaintNotification)
      break
    default:
      console.log(`Unhandled notification type: ${snsMessage.notificationType}`)
      break
  }
}

/**
 * Handle a bounce notification by restricting emails to the bounced recipients for a period of time.
 * @param bounceNotification The bounce notification
 */
const handleBounceNotification = async (bounceNotification: SESBounceNotification) => {
  console.log('Handling bounce notification')
  const bounce = bounceNotification.bounce
  const bounceTime = new Date(bounce.timestamp).getTime()
  const isPermanentBounce = bounce.bounceType === 'Permanent'
  const until = isPermanentBounce
    ? new Date(bounceTime + 100 * 365 * 24 * 60 * 60 * 1000) // 100 years later
    : new Date(bounceTime + 30 * 24 * 60 * 60 * 1000) // 30 days later
  for (const recipient of bounce.bouncedRecipients) {
    const email = recipient.emailAddress
    await timeoutEmail(email, until)
  }
}

/**
 * Handle a complaint notification by restricting emails to the complaining recipients permanently.
 * @param bounceNotification The bounce notification
 */
const handleComplaintNotification = async (complaintNotification: SESComplaintNotification) => {
  console.log('Handling complaint notification')
  const complaint = complaintNotification.complaint
  const complaintTime = new Date(complaint.timestamp).getTime()
  const until = new Date(complaintTime + 100 * 365 * 24 * 60 * 60 * 1000) // 100 years later
  for (const recipient of complaint.complainedRecipients) {
    const email = recipient.emailAddress
    await timeoutEmail(email, until)
  }
}

export default sesComplaintAndBounceHandler
