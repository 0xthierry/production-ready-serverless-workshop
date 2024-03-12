const { SQSClient, ReceiveMessageCommand } = require("@aws-sdk/client-sqs")
const { ReplaySubject, firstValueFrom } = require("rxjs")
const { filter } = require("rxjs/operators")

const startListening = () => {
  const messages = new ReplaySubject(100)
  const messageIds = new Set();
  let stopIt = false;

  const sqs = new SQSClient()
  const queueUrl = process.env.E2ETestQueueUrl

  const loop = async () => {
    while (!stopIt) {
      const command = new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 5
      })

      const response = await sqs.send(command)

      if (response.Messages) {
        for (let i = 0; i < response.Messages.length; i++) {
          if (messageIds.has(response.Messages[i].MessageId)) {
            continue
          }

          messageIds.add(response.Messages[i].MessageId)

          const body = JSON.parse(response.Messages[i].Body)

          if (body.TopicArn) {
            console.log('SNS message received:', body.Message)
            messages.next({
              sourceType: 'sns',
              source: body.TopicArn,
              message: body.Message
            })
          } else if (body.eventBusName) {
            messages.next({
              sourceType: 'eventbridge',
              source: body.eventBusName,
              message: JSON.stringify(body.event)
            })
          }
        }
      }
    }
  }

  const loopStopped = loop()

  const stop = async () => {
    console.info('stop polling SQS...')
    stopIt = true

    await loopStopped;
  }

  const waitForMessage = (predicate) => {
    const data = messages.pipe(
      filter(x => predicate(x))
    )
    return firstValueFrom(data)
  }

  return {
    stop,
    waitForMessage,
  }
}
module.exports = {
  startListening
}