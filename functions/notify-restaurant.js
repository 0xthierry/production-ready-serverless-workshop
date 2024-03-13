const { EventBridgeClient, PutEventsCommand } = require("@aws-sdk/client-eventbridge")
const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns")

const { makeIdempotent } = require("@aws-lambda-powertools/idempotency")
const { DynamoDBPersistenceLayer } = require("@aws-lambda-powertools/idempotency/dynamodb")

const eventBridgeClient = new EventBridgeClient();
const snsClient = new SNSClient()

const persistence = new DynamoDBPersistenceLayer({
  tableName: process.env.idempotency_table
})

const EVENT_BUS_NAME = process.env.event_bus_name
const TOPIC_ARN = process.env.restaurant_notification_topic
const EVENT_NAME = 'restaurant-notified'

const handler = async (event, context) => {
  const order = event.detail
  const publishCommand = new PublishCommand({
    Message: JSON.stringify(order),
    TopicArn: TOPIC_ARN
  })
  await snsClient.send(publishCommand)

  const { restaurantName, orderId } = order;
  console.info(`notified restaurant [${restaurantName}] of order [${orderId}]`)

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

  console.info(`published event ${EVENT_NAME} to ${EVENT_BUS_NAME}`)

  return orderId
}

module.exports.handler = makeIdempotent(handler, { persistenceStore: persistence });