// https://github.com/aws/aws-sdk-js-v3/issues/6141#issuecomment-2136010046

type SESEventNotification =
  | SESBounceNotification
  | SESComplaintNotification
  | SESDeliveryNotification
  | SESSendNotification
  | SESRejectNotification
  | SESOpenNotification
  | SESClickNotification
  | SESRenderingFailureNotification
  | SESDeliveryDelayNotification
  | SESSubscriptionNotification

type SESEventNotificationType =
  | 'Bounce'
  | 'Complaint'
  | 'Delivery'
  | 'Send'
  | 'Reject'
  | 'Open'
  | 'Click'
  | 'Rendering Failure'
  | 'DeliveryDelay'
  | 'Subscription'

type SESCommonNotification = {
  notificationType: SESEventNotificationType
  mail: {
    timestamp: string
    messageId: string
    source: string
    sourceArn: string
    sendingAccountId: string
    destination: string[]
    headersTruncated: boolean
    headers: { name: string; value: string }[]
    commonHeaders: Record<string, string | string[]>
    tags: Record<string, string[]>
  }
}

type BounceTypes =
  | { bounceType: 'Undetermined'; bounceSubType: 'Undetermined' }
  | {
      bounceType: 'Permanent'
      bounceSubType: 'General' | 'NoEmail' | 'Suppressed' | 'OnAccountSuppressionList'
    }
  | {
      bounceType: 'Transient'
      bounceSubType:
        | 'General'
        | 'MailboxFull'
        | 'MessageTooLarge'
        | 'ContentRejected'
        | 'AttachmentRejected'
    }

type SESBounceNotification = SESCommonNotification & {
  notificationType: 'Bounce'
  bounce: BounceTypes & {
    bouncedRecipients: {
      emailAddress: string
      action?: string
      status?: string
      diagnosticCode?: string
    }[]
    timestamp: string
    feedbackId: string
    reportingMTA?: string
  }
}

type SESComplaintNotification = SESCommonNotification & {
  notificationType: 'Complaint'
  complaint: {
    complainedRecipients: { emailAddress: string }[]
    timestamp: string
    feedbackId: string
    complaintSubType?: string
    userAgent?: string
    complaintFeedbackType?: 'abuse' | 'auth-failure' | 'fraud' | 'not-spam' | 'other' | 'virus'
    arrivalDate?: string
  }
}

type SESDeliveryNotification = SESCommonNotification & {
  notificationType: 'Delivery'
  delivery: {
    timestamp: string
    processingTimeMillis: number
    recipients: string[]
    smtpResponse: string
    reportingMTA?: string
  }
}

type SESSendNotification = SESCommonNotification & {
  notificationType: 'Send'
  send: {}
}

type SESRejectNotification = SESCommonNotification & {
  notificationType: 'Reject'
  reject: {
    reason: string
  }
}

type SESOpenNotification = SESCommonNotification & {
  notificationType: 'Open'
  open: {
    ipAddress: string
    timestamp: string
    userAgent: string
  }
}

type SESClickNotification = SESCommonNotification & {
  notificationType: 'Click'
  click: {
    ipAddress: string
    link: string
    linkTags: Record<string, string[]>
    timestamp: string
    userAgent: string
  }
}

type SESRenderingFailureNotification = SESCommonNotification & {
  notificationType: 'Rendering Failure'
  failure: {
    templateName: string
    errorMessage: string
  }
}

type SESDeliveryDelayNotification = SESCommonNotification & {
  notificationType: 'DeliveryDelay'
  deliveryDelay: {
    delayType:
      | 'InternalFailure'
      | 'General'
      | 'MailboxFull'
      | 'SpamDetected'
      | 'RecipientServerError'
      | 'IPFailure'
      | 'TransientCommunicationFailure'
      | 'BYOIPHostNameLookupUnavailable'
      | 'Undetermined'
      | 'SendingDeferral'
    delayedRecipients: { emailAddress: string; status: string; diagnosticCode: string }[]
    expirationTime: string
    reportingMTA?: string
    timestamp: string
  }
}

type SESSubscriptionNotification = SESCommonNotification & {
  notificationType: 'Subscription'
  subscription: {
    contactList: string
    timestamp: string
    source: string
    newTopicPreferences: TopicPreferences
    oldTopicPreferences: TopicPreferences
  }
}

type TopicPreferences = {
  unsubscribeAll: boolean
  topicSubscriptionStatus: {
    topicName: EmailTopic
    subscriptionStatus: 'OptIn' | 'OptOut'
  }[]
  topicDefaultSubscriptionStatus: {
    topicName: EmailTopic
    subscriptionStatus: 'OptIn' | 'OptOut'
  }[]
}
