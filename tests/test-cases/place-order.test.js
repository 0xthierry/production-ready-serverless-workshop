const when = require('../steps/when')
const teardown = require('../steps/teardown');
const given = require('../steps/given');
const messages = require('../utils/messages')

describe(`Given an authenticated user`, () => {
  let user = null;
  let listener = null;

  beforeAll(async () => {
    user = await given.anAuthenticatedUser();
    listener = messages.startListening()
  })

  afterAll(async () => {
    if (user) {
      await teardown.anAuthenticatedUser(user);
    }
    listener.stop()
  })

  describe(`When we invoke the POST /orders endpoint`, () => {
    let response = null;

    beforeAll(async () => {
      response = await when.weInvokePlaceOrder(user, 'cartoon')
    })

    it(`Should return 200`, async () => {
      expect(response.statusCode).toEqual(200)
    })

    it(`Should publish an event to EventBridge`, async () => {
      const { orderId } = response.body
      const expectedMessage = JSON.stringify({
        source: 'big-mouth',
        'detail-type': 'order-placed',
        detail: {
          orderId,
          restaurantName: 'cartoon'
        }
      })
      await listener.waitForMessage((x) =>
        x.sourceType === 'eventbridge' &&
        x.source === process.env.event_bus_name &&
        x.message === expectedMessage
      )
    })
  })
})