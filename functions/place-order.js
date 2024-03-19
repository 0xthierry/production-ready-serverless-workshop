const { EventBridgeClient, PutEventsCommand } = require("@aws-sdk/client-eventbridge")
const eventBridgeClient = new EventBridgeClient();
const { randomUUID } = require('crypto')

const { Logger, } = require('@aws-lambda-powertools/logger')
const { injectLambdaContext } = require('@aws-lambda-powertools/logger/middleware')
const logger = new Logger({ serviceName: process.env.service_name })

const middy = require('@middy/core')

const EVENT_BUS_NAME = process.env.event_bus_name
const EVENT_NAME = 'order-placed'

module.exports.handler = middy(async (event, context) => {
  logger.refreshSampleRateCalculation()
  const restaurantName = JSON.parse(event.body).restaurantName;
  const orderId = `ord_${randomUUID()}`;
  logger.info(`placing order`, {
    orderId,
    restaurantName
  })

  const putEvent = new PutEventsCommand({
    Entries: [{
      Source: 'big-mouth',
      DetailType: EVENT_NAME,
      Detail: JSON.stringify({
        orderId,
        restaurantName
      }),
      EventBusName: EVENT_BUS_NAME
    }]
  })
  await eventBridgeClient.send(putEvent)

  logger.info(`published event to eventbridge`, {
    eventBusName: EVENT_BUS_NAME,
    eventName: EVENT_NAME,
  })

  const response = {
    statusCode: 200,
    body: JSON.stringify({
      orderId
    })
  }

  return response;
}).use(injectLambdaContext(logger));