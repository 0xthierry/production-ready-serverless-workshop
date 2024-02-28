const when = require('../steps/when')
const teardown = require('../steps/teardown');
const given = require('../steps/given');

describe(`When we invoke the POST /restaurants/search endpoint with theme 'cartoon'`, () => {
  let user = null;

  beforeEach(async () => {
    user = await given.anAuthenticatedUser();
  });

  afterEach(async () => {
    if (user) {
      await teardown.anAuthenticatedUser(user);
    }
  });

  it(`Should return an array of 4 restaurants`, async () => {
    let res = await when.weInvokeSearchRestaurants('cartoon', user)

    expect(res.statusCode).toEqual(200)
    expect(res.body).toHaveLength(4)
    expect(res.body.every(restaurant => restaurant.hasOwnProperty('name') && restaurant.hasOwnProperty('image'))).toBeTruthy()
  })
})