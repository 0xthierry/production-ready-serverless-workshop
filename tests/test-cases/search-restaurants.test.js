const when = require('../steps/when')

describe(`When we invoke the POST /restaurants/search endpoint with theme 'cartoon'`, () => {
  it(`Should return an array of 4 restaurants`, async () => {
    let res = await when.weInvokeSearchRestaurants('cartoon')

    expect(res.statusCode).toEqual(200)
    expect(res.body).toHaveLength(4)
    expect(res.body.every(restaurant => restaurant.hasOwnProperty('name') && restaurant.hasOwnProperty('image'))).toBeTruthy()
  })
})