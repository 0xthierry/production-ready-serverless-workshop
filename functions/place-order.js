const { EventBridgeClient, PutEventsCommand } = require("@aws-sdk/client-eventbridge")
const eventBridgeClient = new EventBridgeClient();
const {randomUUID} = require('crypto')

const EVENT_BUS_NAME = process.env.event_bus_name
const EVENT_NAME = 'order-placed'

module.exports.handler = async (event, context) => {
  const restaurantName = JSON.parse(event.body).restaurantName;
  const orderId = `ord_${randomUUID()}`;
  console.info(`placing order ID [${orderId}] at restaurant [${restaurantName}]`)

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

  console.info(`published event ${EVENT_NAME} to ${EVENT_BUS_NAME}`)

  const response = {
    statusCode: 200,
    body: JSON.stringify({
      orderId
    })
  }

  return response;
};