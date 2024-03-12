const _ = require('lodash')
const aws4 = require('aws4')
const http = require('axios')
const { EventBridgeClient, PutEventsCommand } = require("@aws-sdk/client-eventbridge")

const APP_ROOT = '../../'
const TEST_MODE = process.env.TEST_MODE

const viaHandler = async (event, functionName) => {
  const handler = require(`${APP_ROOT}/functions/${functionName}`).handler
  const context = {}
  const response = await handler(event, context)
  const contentType = _.get(response, 'headers.content-type', 'application/json');
  if (_.get(response, 'body') && contentType === 'application/json') {
    response.body = JSON.parse(response.body)
  }
  return response
};

const respondFrom = async (httpRes) => ({
  statusCode: httpRes.status,
  body: httpRes.data,
  headers: httpRes.headers
})

const signHttpRequest = (urlRaw) => {
  const url = new URL(urlRaw)
  const opts = {
    host: url.hostname,
    path: url.pathname
  }

  aws4.sign(opts)
  return opts.headers
}

const viaHTTP = async (relPath, method, opts) => {
  const url = `${process.env.rest_api_url}/${relPath}`
  console.info(`invoking via HTTP ${method} ${url}`)

  try {
    const data = _.get(opts, "body")
    let headers = {}
    if (_.get(opts, "iam_auth", false) === true) {
      headers = signHttpRequest(url)
    }

    const authHeader = _.get(opts, "auth")

    if (authHeader) {
      headers.Authorization = `Bearer ${authHeader}`
    }

    const httpReq = http.request({
      method, url, headers, data
    })

    const res = await httpReq
    return respondFrom(res)
  } catch (err) {
    if (err.response && err.response.status) {
      return {
        statusCode: err.response.status,
        headers: err.response.headers
      }
    } else {
      throw err
    }
  }
}

const viaEventBridge = async (busName, source, detailType, detail) => {
  const eventBridge = new EventBridgeClient()

  const putEventsCmd = new PutEventsCommand({
    Entries: [{
      Source: source,
      DetailType: detailType,
      Detail: JSON.stringify(detail),
      EventBusName: busName
    }]
  })
  console.info(`[eventbridge] sending event: ${JSON.stringify(putEventsCmd)}`)
  await eventBridge.send(putEventsCmd)
}


const invokeByTestMode = (fA, fB) => async (...args) => {
  switch (TEST_MODE) {
    case 'handler':
      return fA && await fA(...args)
    case 'http':
      return fB && await fB(...args)
    default:
      throw new Error(`Unsupported TEST_MODE: ${TEST_MODE}`)
  }
}

const weInvokeGetIndex = invokeByTestMode(() => viaHandler({}, 'get-index'), () => viaHTTP('', 'GET'))

const weInvokeGetRestaurants = invokeByTestMode(() => viaHandler({}, 'get-restaurants'), () => viaHTTP('restaurants', 'GET', { iam_auth: true }))

const weInvokeSearchRestaurants = invokeByTestMode((theme) => viaHandler({ body: JSON.stringify({ theme }) }, 'search-restaurants'), (theme, user) => viaHTTP('restaurants/search', 'POST', { body: { theme }, auth: user && user.idToken }))

const weInvokePlaceOrder = invokeByTestMode((_, restaurantName) => viaHandler({ body: JSON.stringify({ restaurantName }) }, 'place-order'), (user, restaurantName) => viaHTTP('orders', 'POST', { body: { restaurantName }, auth: user && user.idToken }))

const weInvokeNotifyRestaurant = invokeByTestMode((event) => viaHandler(event, 'notify-restaurant'), async (event) => {
  const busName = process.env.event_bus_name
  await viaEventBridge(busName, event.source, event['detail-type'], event.detail)
})

module.exports = {
  weInvokeGetIndex,
  weInvokeGetRestaurants,
  weInvokeSearchRestaurants,
  weInvokePlaceOrder,
  weInvokeNotifyRestaurant: weInvokeNotifyRestaurant,
}