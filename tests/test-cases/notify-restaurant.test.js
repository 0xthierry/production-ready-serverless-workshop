const { EventBridgeClient } = require("@aws-sdk/client-eventbridge")
const { SNSClient } = require("@aws-sdk/client-sns")
const {randomUUID} = require("crypto")

const when = require('../steps/when')
const messages = require('../utils/messages')

const mockEventBridgeSendMethod = jest.fn()
EventBridgeClient.prototype.send = mockEventBridgeSendMethod

const mockSNSSendMethod = jest.fn()
SNSClient.prototype.send = mockSNSSendMethod

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
    if (process.env.TEST_MODE === "handler") {
      mockEventBridgeSendMethod.mockClear()
      mockSNSSendMethod.mockClear()

      mockEventBridgeSendMethod.mockReturnValue({})
      mockSNSSendMethod.mockReturnValue({})
    } else {
      listener = messages.startListening()
    }
    await when.weInvokeNotifyRestaurant(event)
  })

  afterAll(async () => {
    if (process.env.TEST_MODE === "handler") {
      mockEventBridgeSendMethod.mockClear()
      mockSNSSendMethod.mockClear()
    } else {
      listener.stop()
    }
  })

  if (process.env.TEST_MODE === "handler") {
    it(`Should publish an event to a SNS topic`, async () => {
      expect(mockSNSSendMethod).toHaveBeenCalledTimes(1)
      const [params] = mockSNSSendMethod.mock.calls[0]
      expect(params.input).toStrictEqual({
        Message: expect.stringContaining(`"orderId":"ord_`),
        TopicArn: process.env.restaurant_notification_topic
      })
    })

    it(`Should publish an event to EventBridge`, async () => {
      expect(mockEventBridgeSendMethod).toHaveBeenCalledTimes(1)
      const [params] = mockEventBridgeSendMethod.mock.calls[0]
      expect(params.input).toStrictEqual({
        Entries: [
          expect.objectContaining({
            Source: 'big-mouth',
            DetailType: 'restaurant-notified',
            Detail: expect.stringContaining(`"orderId":"ord_`),
            EventBusName: process.env.event_bus_name
          })
        ]
      })
    })
  } else {
    it('Should publish messages to SNS', async () => {
      await listener.waitForMessage((x) =>
        x.sourceType === 'sns' &&
        x.source === process.env.restaurant_notification_topic &&
        x.message.startsWith('{"orderId"'),
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
  }
})