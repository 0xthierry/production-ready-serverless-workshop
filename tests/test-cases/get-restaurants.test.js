const when = require('../steps/when')

describe(`When we invoke the GET /restaurants endpoint`, () => {
  it(`Should return an array of 8 restaurants`, async () => {
    const res = await when.weInvokeGetRestaurants()

    expect(res.statusCode).toEqual(200)
    expect(res.body).toHaveLength(8)
    expect(res.body.every(restaurant => restaurant.hasOwnProperty('name') && restaurant.hasOwnProperty('image'))).toBeTruthy()
  })
})