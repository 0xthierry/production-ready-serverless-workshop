const { EventBridgeClient } = require("@aws-sdk/client-eventbridge")
const { SNSClient } = require("@aws-sdk/client-sns")
const chance = require("chance").Chance()

const when = require('../steps/when')

const mockEventBridgeSendMethod = jest.fn()
EventBridgeClient.prototype.send = mockEventBridgeSendMethod

const mockSNSSendMethod = jest.fn()
SNSClient.prototype.send = mockSNSSendMethod

describe(`When we receive an "order-placed" event`, () => {
  if (process.env.TEST_MODE === "handler") {

    beforeAll(async () => {
      mockEventBridgeSendMethod.mockClear()
      mockSNSSendMethod.mockClear()

      mockEventBridgeSendMethod.mockReturnValue({})
      mockSNSSendMethod.mockReturnValue({})

      const event = {
        source: 'big-mouth',
        'detail-type': 'order_placed',
        detail: {
          orderId: `ord_${chance.guid()}`,
          userEmail: chance.email(),
          restaurantName: 'Fangtasia'
        }
      }

      await when.weInvokeNotifyRestaurant(event)
    })

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
    it('no e2e test', () => {})
  }
})