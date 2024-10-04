import { DynamoDB, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'

export const dynamoDb = new DynamoDB()
export const TIMEOUT_TABLE_NAME = process.env.TIMEOUT_TABLE_NAME

type BounceRecord = {
  email: string
  until: Date
}

/**
 * Timeout an email address until a certain date
 * @param email The email address to timeout
 * @param until The date the email address is timed out
 */
export const timeoutEmail = async (email: string, until: Date) => {
  const bounceRecord: BounceRecord = {
    email,
    until,
  }

  const putCommand = new PutItemCommand({
    TableName: TIMEOUT_TABLE_NAME!,
    Item: marshall(bounceRecord),
  })

  try {
    await dynamoDb.send(putCommand)
    console.log(
      `Timing out email=${email} until=${until.toISOString()} table=${TIMEOUT_TABLE_NAME}`
    )
  } catch (error) {
    console.error(`Failed to timeout email=${email} table=${TIMEOUT_TABLE_NAME} error=${error}`)
  }
}

/**
 * Check if an email address is timed out
 * @param email The email address to check
 * @returns True if the email address is timed out, false otherwise
 */
export const isEmailTimedOut = async (email: string) => {
  const getCommand = new GetItemCommand({
    TableName: TIMEOUT_TABLE_NAME!,
    Key: { email: { S: email } },
  })

  try {
    const response = await dynamoDb.send(getCommand)
    const item = response.Item
    if (!item) {
      return false
    }

    const bounceRecord = unmarshall(item) as BounceRecord
    const until = new Date(bounceRecord.until)
    return until.getTime() > Date.now()
  } catch (error) {
    console.error(
      `Failed to check if email=${email} is timed out table=${TIMEOUT_TABLE_NAME} error=${error}`
    )
    return false
  }
}
