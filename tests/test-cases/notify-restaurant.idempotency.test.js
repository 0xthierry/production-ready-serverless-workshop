const { randomUUID } = require("crypto")

const when = require('../steps/when')

const { SNSClient } = require("@aws-sdk/client-sns")
const { EventBridgeClient } = require("@aws-sdk/client-eventbridge")

const snsSendMock = jest.fn()
const eventBridgeSendMock = jest.fn()

SNSClient.prototype.send = snsSendMock
EventBridgeClient.prototype.send = eventBridgeSendMock

describe(`When we invoke the notify-restaurant function twice with the same orderId`, () => {
  const event = {
    source: 'big-mouth',
    'detail-type': 'order-placed',
    detail: {
      orderId: `ord_${randomUUID()}`,
      restaurantName: 'Fangtasia'
    }
  }

  beforeAll(async () => {
    snsSendMock.mockClear()
    eventBridgeSendMock.mockClear()

    snsSendMock.mockReturnValue({})
    eventBridgeSendMock.mockReturnValue({})

    await when.weInvokeNotifyRestaurant(event)
    await when.weInvokeNotifyRestaurant(event)
  })

  if (process.env.TEST_MODE === 'handler') {
    it('Should only publish message to SNS once', async () => {
      expect(snsSendMock).toHaveBeenCalledTimes(1)
    })

    it('Should publish message to event bridge once', async () => {
      expect(eventBridgeSendMock).toHaveBeenCalledTimes(1)
    })
  } else {
    it("no e2e tests", () => { })
  }
})