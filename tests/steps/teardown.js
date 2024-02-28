const { 
  CognitoIdentityProviderClient,
  AdminDeleteUserCommand
} = require('@aws-sdk/client-cognito-identity-provider')

const anAuthenticatedUser = async (user) => {
  const cognito = new CognitoIdentityProviderClient()
  
  let req = new AdminDeleteUserCommand({
    UserPoolId: process.env.cognito_user_pool_id,
    Username: user.username
  })
  await cognito.send(req)
  
  console.log(`[${user.username}] - user deleted`)
}

module.exports = {
  anAuthenticatedUser
}
