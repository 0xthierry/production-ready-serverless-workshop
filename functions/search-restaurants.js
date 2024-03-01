const middy = require('@middy/core')
const ssm = require('@middy/ssm')

const { DynamoDB } = require("@aws-sdk/client-dynamodb")
const { DynamoDBDocumentClient, ScanCommand } = require("@aws-sdk/lib-dynamodb")

const dynamodbClient = new DynamoDB()
const dynamodb = DynamoDBDocumentClient.from(dynamodbClient)

const { restaurants_table: tableName, service_name: serviceName, stage } = process.env;

const findRestaurantsByTheme = async (theme, limit) => {
  console.log(`finding (${limit}) restaurants with the theme ${theme} from ${tableName}...`)

  const resp = await dynamodb.send(new ScanCommand({
    TableName: tableName,
    Limit: limit,
    FilterExpression: "contains(themes, :theme)",
    ExpressionAttributeValues: {
      ":theme": theme
    }
  }))

  console.log(`found ${resp.Items.length} restaurants`)

  return resp.Items
}

module.exports.handler = middy(async (event, context) => {
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
    config: `/${serviceName}/${stage}/search-restaurants/config`
  }
}));