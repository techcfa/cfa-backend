const axios = require('axios');

const BASE_URL = 'http://localhost:5004';

async function testBasicEndpoints() {
  console.log('🧪 Testing CFA Backend API...\n');

  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check passed:', healthResponse.data.status);

    // Test API info endpoint
    console.log('\n2. Testing API info endpoint...');
    const infoResponse = await axios.get(`${BASE_URL}/`);
    console.log('✅ API info retrieved:', infoResponse.data.message);

    // Test subscription plans endpoint
    console.log('\n3. Testing subscription plans endpoint...');
    const plansResponse = await axios.get(`${BASE_URL}/api/subscription/plans`);
    console.log('✅ Subscription plans retrieved:', plansResponse.data.length, 'plans found');

    // Test media endpoint
    console.log('\n4. Testing media endpoint...');
    const mediaResponse = await axios.get(`${BASE_URL}/api/media`);
    console.log('✅ Media endpoint working:', mediaResponse.data.media.length, 'items found');

    console.log('\n🎉 All basic tests passed!');
    console.log('\n📚 API Documentation available at: http://localhost:5004/api-docs');
    console.log('🏥 Health check available at: http://localhost:5004/health');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testBasicEndpoints();
}

module.exports = { testBasicEndpoints }; 