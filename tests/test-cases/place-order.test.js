const { EventBridgeClient } = require("@aws-sdk/client-eventbridge")

const when = require('../steps/when')
const teardown = require('../steps/teardown');
const given = require('../steps/given');

const mockEventBridgeSendMethod = jest.fn()
EventBridgeClient.prototype.send = mockEventBridgeSendMethod


describe(`Given an authenticated user`, () => {
  let user = null;

  beforeAll(async () => {
    user = await given.anAuthenticatedUser();
  })

  afterAll(async () => {
    if (user) {
      await teardown.anAuthenticatedUser(user);
    }
  })

  describe(`When we invoke the POST /orders endpoint`, () => {
    let response = null;

    beforeAll(async () => {
      mockEventBridgeSendMethod.mockClear()
      mockEventBridgeSendMethod.mockReturnValue({})

      response = await when.weInvokePlaceOrder(user, 'cartoon')
    })

    it(`Should return 200`, async () => {
      expect(response.statusCode).toEqual(200)
    })

    if (process.env.TEST_MODE === 'handler') {
      it(`Should publish an event to EventBridge`, async () => {
        expect(mockEventBridgeSendMethod).toHaveBeenCalledTimes(1)
        const [params] = mockEventBridgeSendMethod.mock.calls[0]
        expect(params.input).toStrictEqual({
          Entries: [
            expect.objectContaining({
              Source: undefined,
              DetailType: 'order-placed',
              Detail: expect.stringContaining(`"orderId":"ord_`),
              EventBusName: process.env.event_bus_name
            })
          ]
        })
      })
    }
  })
})