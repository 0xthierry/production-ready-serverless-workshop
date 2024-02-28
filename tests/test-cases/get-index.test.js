const cheerio = require('cheerio');
const when = require('../steps/when');

describe('When we invoke the GET / endpoint', () => {
  it('should return the index page with 8 restaurants', async () => {
    const response = await when.weInvokeGetIndex();

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('text/html; charset=utf-8');
    expect(response.body).toBeDefined();

    const $ = cheerio.load(response.body);
    const restaurants = $('.restaurant', '#restaurantsUl');
    expect(restaurants.length).toEqual(8);
  });
});