const { DynamoDB } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const dynamodbClient = new DynamoDB()
const dynamodb = new DynamoDBDocumentClient(dynamodbClient)

const defaultResults = Number(process.env.defaultResults);
const tableName = process.env.restaurants_table;

module.exports.handler = async (event, context) => {
  console.log(`fetching ${defaultResults} restaurants from ${tableName}...`)

  const resp = await dynamodb.send(new ScanCommand({
    TableName: tableName,
    Limit: defaultResults
  }));

  console.log(`found ${resp.Items.length} restaurants`);

  const response = {
    statusCode: 200,
    body: JSON.stringify(resp.Items)
  }

  return response
}