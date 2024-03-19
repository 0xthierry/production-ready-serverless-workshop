const middy = require('@middy/core')
const ssm = require('@middy/ssm')

const { DynamoDB } = require("@aws-sdk/client-dynamodb")
const { DynamoDBDocumentClient, ScanCommand } = require("@aws-sdk/lib-dynamodb")

const { Logger, } = require('@aws-lambda-powertools/logger')
const { injectLambdaContext } = require('@aws-lambda-powertools/logger/middleware')
const logger = new Logger({ serviceName: process.env.service_name })

const { Tracer } = require("@aws-lambda-powertools/tracer")
const { captureLambdaHandler } = require("@aws-lambda-powertools/tracer/middleware")
const tracer = new Tracer({ serviceName: process.env.service_name })

const dynamodbClient = new DynamoDB()
const dynamodb = DynamoDBDocumentClient.from(dynamodbClient)

tracer.captureAWSv3Client(dynamodbClient)

const { restaurants_table: tableName, service_name: serviceName, ssmStage } = process.env;

const findRestaurantsByTheme = async (theme, limit) => {
  logger.debug(
    `finding restaurants`,
    {
      limit,
      theme,
      tableName
    }
  )

  const resp = await dynamodb.send(new ScanCommand({
    TableName: tableName,
    Limit: limit,
    FilterExpression: "contains(themes, :theme)",
    ExpressionAttributeValues: {
      ":theme": theme
    }
  }))

  logger.debug('found restaurants', {
    count: resp.Items.length
  })

  return resp.Items
}

module.exports.handler = middy(async (event, context) => {
  logger.refreshSampleRateCalculation()
  const req = JSON.parse(event.body) || {}

  const theme = req.theme
  const restaurants = await findRestaurantsByTheme(theme, context.config.default_results)

  const response = {
    statusCode: 200,
    body: JSON.stringify(restaurants)
  }

  return response
}).use(ssm({
  cache: true,
  cacheExpiryInMillis: 1 * 60 * 1000, // 1 mins
  setToContext: true,
  fetchData: {
    config: `/${serviceName}/${ssmStage}/search-restaurants/config`,
    secretString: `/${serviceName}/${ssmStage}/search-restaurants/secret-string`
  }
})).use(injectLambdaContext(logger)).use(captureLambdaHandler(tracer))