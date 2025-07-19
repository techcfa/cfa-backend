const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

const client = new SecretsManagerClient({ region: 'eu-north-1' });

async function getSecrets() {
  try {
    const command = new GetSecretValueCommand({ SecretId: 'google_auth.json' });
    const response = await client.send(command);
    return JSON.parse(response.SecretString);
  } catch (error) {
    console.error('Failed to retrieve secrets:', error);
    throw error;
  }
}

module.exports = getSecrets;