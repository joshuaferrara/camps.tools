import sesComplaintAndBounceHandler from './lambdas/ses-complaint-n-bounce-handler'
import sesEmailHandler from './lambdas/ses-email-handler'

module.exports = { sesEmailHandler, sesComplaintAndBounceHandler }
