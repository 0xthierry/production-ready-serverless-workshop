const APP_ROOT = '../../'
const _ = require('lodash')

const viaHandler = async (event, functionName) => {
  const handler = require(`${APP_ROOT}/functions/${functionName}`).handler
  const context = {}
  const response = await handler(event, context)
  const contentType = _.get(response, 'headers.Content-Type', 'application/json');
  if (response.body && contentType === 'application/json') {
    response.body = JSON.parse(response.body)
  }
  return response
};

const weInvokeGetIndex = () => viaHandler({}, 'get-index')

const weInvokeGetRestaurants = () => viaHandler({}, 'get-restaurants')

const weInvokeSearchRestaurants = (theme) => viaHandler({ body: JSON.stringify({ theme }) }, 'search-restaurants')

module.exports = {
  weInvokeGetIndex,
  weInvokeGetRestaurants,
  weInvokeSearchRestaurants,
}