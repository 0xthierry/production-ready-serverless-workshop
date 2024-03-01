const middy = require('@middy/core')
const ssm = require('@middy/ssm')

const { DynamoDB } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const dynamodbClient = new DynamoDB()
const dynamodb = new DynamoDBDocumentClient(dynamodbClient)

const { restaurants_table: tableName, service_name: serviceName, stage } = process.env;

module.exports.handler = middy(async (event, context) => {
  console.log(`fetching ${context.config.default_results} restaurants from ${tableName}...`)

  const resp = await dynamodb.send(new ScanCommand({
    TableName: tableName,
    Limit: context.config.default_results
  }));

  console.log(`found ${resp.Items.length} restaurants`);

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
    config: `/${serviceName}/${stage}/get-restaurants/config`
  }
}))