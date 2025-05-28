import { apiKeyService } from '../services/apiKeyService.js';

async function createInitialApiKey() {
  const key = await apiKeyService.createApiKey({
    name: 'Ayobami Esther',
    email: 'ayobamiekundayo3@gmail.com',
    role: 'user',
    ips: ['102.89.41.29'],
  });
  console.log(`${
    key.role.charAt(0).toUpperCase() + key.role.slice(1)
  } API Key:`, key);
}

createInitialApiKey().catch(console.error);