const axios = require('axios');
const connectDB = require('../config/database');
const User = require('../models/User');

const BASE_URL = 'http://localhost:5004';

async function runEmailOtpFlow() {
  const targetEmail = process.argv[2] || 'gaman0221@gmail.com';
  const fullName = 'CFA Email OTP E2E Test';

  try {
    // Ensure server is up
    await axios.get(`${BASE_URL}/health`, { timeout: 5000 });

    console.log(`\n🧪 Sending OTP to ${targetEmail} ...`);
    await axios.post(`${BASE_URL}/api/auth/email/send-otp`, { email: targetEmail, fullName });
    console.log('✅ OTP send endpoint responded OK');

    // Connect to DB and fetch OTP
    await connectDB();
    const user = await User.findOne({ email: targetEmail });
    if (!user) {
      console.log('❌ No user found after sending OTP');
      return;
    }
    if (!user.otp || !user.otp.code) {
      console.log('❌ OTP not saved on user document');
      return;
    }

    const otp = user.otp.code;
    console.log(`🔎 Found OTP in DB: ${otp} (expires: ${user.otp.expiresAt.toISOString()})`);

    // Verify OTP
    console.log('🔐 Verifying OTP...');
    const verifyResp = await axios.post(`${BASE_URL}/api/auth/email/verify-otp`, { email: targetEmail, otp });
    const { token, user: userResp } = verifyResp.data || {};
    if (!token) {
      console.log('❌ No token returned from verify endpoint');
      return;
    }
    console.log('✅ OTP verified. JWT received.');
    console.log(`👤 User verified: ${userResp?.isVerified}, email: ${userResp?.email}`);

    console.log('\n🎉 Email OTP flow test passed');
  } catch (error) {
    console.error('❌ Email OTP flow test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  } finally {
    // mongoose connection is handled by app; no explicit close here
    process.exit(0);
  }
}

if (require.main === module) {
  runEmailOtpFlow();
}

module.exports = { runEmailOtpFlow };

