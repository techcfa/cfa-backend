const axios = require('axios');

const BASE_URL = 'http://localhost:5004';

async function testSendEmailOtp() {
  const targetEmail = process.argv[2] || 'gaman0221@gmail.com';
  const fullName = 'CFA Email OTP Test';

  try {
    // Ensure server is up
    await axios.get(`${BASE_URL}/health`, { timeout: 5000 });

    console.log(`\n🧪 Sending OTP to ${targetEmail} ...`);
    const resp = await axios.post(`${BASE_URL}/api/auth/email/send-otp`, {
      email: targetEmail,
      fullName
    });
    console.log('✅ Endpoint responded:', resp.data);
    console.log('📬 Check your inbox for the OTP email.');
  } catch (error) {
    console.error('❌ Email OTP test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

if (require.main === module) {
  testSendEmailOtp();
}

module.exports = { testSendEmailOtp };

