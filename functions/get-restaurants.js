const middy = require('@middy/core')
const ssm = require('@middy/ssm')

const { DynamoDB } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const { Logger, } = require('@aws-lambda-powertools/logger')
const { injectLambdaContext } = require('@aws-lambda-powertools/logger/middleware')
const logger = new Logger({ serviceName: process.env.service_name })

const { Tracer } = require("@aws-lambda-powertools/tracer")
const { captureLambdaHandler } = require("@aws-lambda-powertools/tracer/middleware")
const tracer = new Tracer({ serviceName: process.env.service_name })

const dynamodbClient = new DynamoDB()
const dynamodb = new DynamoDBDocumentClient(dynamodbClient)

tracer.captureAWSv3Client(dynamodbClient)

const { restaurants_table: tableName, service_name: serviceName, ssmStage } = process.env;

module.exports.handler = middy(async (event, context) => {
  logger.refreshSampleRateCalculation()
  logger.debug('get-restaurants is executing...', {
    tableName: tableName,
    count: context.config.default_results
  })

  const resp = await dynamodb.send(new ScanCommand({
    TableName: tableName,
    Limit: context.config.default_results
  }));

  logger.debug('got restaurants', {
    count: resp.Items.length
  })

  const response = {
    statusCode: 200,
    body: JSON.stringify(resp.Items)
  }

  return response
}).use(ssm({
  cache: true,
  cacheExpiryInMillis: 1 * 60 * 1000, // 1 mins
  setToContext: true,
  fetchData: {
    config: `/${serviceName}/${ssmStage}/get-restaurants/config`
  }
})).use(injectLambdaContext(logger)).use(captureLambdaHandler(tracer))