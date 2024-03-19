const { EventBridgeClient, PutEventsCommand } = require("@aws-sdk/client-eventbridge")
const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns")

const { makeIdempotent } = require("@aws-lambda-powertools/idempotency")
const { DynamoDBPersistenceLayer } = require("@aws-lambda-powertools/idempotency/dynamodb")

const { Logger, } = require('@aws-lambda-powertools/logger')
const { injectLambdaContext } = require('@aws-lambda-powertools/logger/middleware')
const logger = new Logger({ serviceName: process.env.service_name })

const { Tracer } = require("@aws-lambda-powertools/tracer")
const { captureLambdaHandler } = require("@aws-lambda-powertools/tracer/middleware")
const tracer = new Tracer({ serviceName: process.env.service_name })

const middy = require('@middy/core')

const eventBridgeClient = new EventBridgeClient();
const snsClient = new SNSClient()

tracer.captureAWSv3Client(eventBridgeClient)
tracer.captureAWSv3Client(snsClient)

const persistence = new DynamoDBPersistenceLayer({
  tableName: process.env.idempotency_table
})

const EVENT_BUS_NAME = process.env.event_bus_name
const TOPIC_ARN = process.env.restaurant_notification_topic
const EVENT_NAME = 'restaurant-notified'

const handler = async (event, context) => {
  logger.refreshSampleRateCalculation()
  const order = event.detail
  const publishCommand = new PublishCommand({
    Message: JSON.stringify(order),
    TopicArn: TOPIC_ARN
  })
  await snsClient.send(publishCommand)

  const { restaurantName, orderId } = order;
  logger.info(`notified restaurant`, {
    restaurantName,
    orderId
  })

  const putEvent = new PutEventsCommand({
    Entries: [
      {
        Source: 'big-mouth',
        DetailType: EVENT_NAME,
        Detail: JSON.stringify(order),
        EventBusName: EVENT_BUS_NAME
      }
    ]
  })
  await eventBridgeClient.send(putEvent)

  logger.info(`published event to eventbridge`, {
    eventBusName: EVENT_BUS_NAME,
    eventName: EVENT_NAME,
  })

  return orderId
}

module.exports.handler = middy(makeIdempotent(handler, { persistenceStore: persistence }))
  .use(injectLambdaContext(logger))
  .use(captureLambdaHandler(tracer)) 