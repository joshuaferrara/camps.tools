/**
 * Split a string into messages that are less than maxLength characters each
 * @param str The string to split
 * @param maxLength The maximum length of each message
 * @returns A list of messages
 */
const splitStringToMessages = (str: string, maxLength: number) => {
  const responseLines = str.split('\n')
  let messages: string[] = []
  let message = ''
  for (const line of responseLines) {
    if (message.length + line.length <= maxLength) {
      message += line + '\n'
    } else {
      messages.push(message)
      message = line + '\n'
    }
  }
  messages.push(message)
  messages = messages.map((m) => m.trimEnd())
  return messages
}

export { splitStringToMessages }
