const { randomUUID } = require("crypto")

const when = require('../steps/when')
const messages = require('../utils/messages')

describe(`When we receive an "order-placed" event`, () => {
  const event = {
    source: 'big-mouth',
    'detail-type': 'order-placed',
    detail: {
      orderId: `ord_${randomUUID()}`,
      restaurantName: 'Fangtasia'
    }
  }
  let listener

  beforeAll(async () => {
    listener = messages.startListening()
    await when.weInvokeNotifyRestaurant(event)
  })

  afterAll(async () => {
    listener.stop()
  })

  it('Should publish messages to a SNS topic', async () => {
    await listener.waitForMessage((x) =>
      x.sourceType === 'sns' &&
      x.source === process.env.restaurant_notification_topic &&
      x.message === JSON.stringify(event.detail),
    )
  }, 10000)

  it('Should publish "restaurant-notified" to event bridge', async () => {
    const expectedMessage = JSON.stringify({
      ...event,
      'detail-type': 'restaurant-notified',
    })
    await listener.waitForMessage((x) =>
      x.sourceType === 'eventbridge' &&
      x.source === process.env.event_bus_name &&
      x.message === expectedMessage
    )
  }, 10000)
})