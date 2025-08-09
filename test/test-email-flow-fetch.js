const connectDB = require('../config/database');
const User = require('../models/User');

const BASE_URL = 'http://localhost:5004';

async function runEmailOtpFlowFetch() {
  const targetEmail = process.argv[2] || 'gaman0221@gmail.com';
  const fullName = 'CFA Email OTP E2E Test (fetch)';

  try {
    // Ensure server is up
    const health = await fetch(`${BASE_URL}/health`);
    if (!health.ok) throw new Error(`Health check failed: ${health.status}`);

    console.log(`\n🧪 Sending OTP to ${targetEmail} (using fetch)...`);
    const sendResp = await fetch(`${BASE_URL}/api/auth/email/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: targetEmail, fullName })
    });
    if (!sendResp.ok) {
      const err = await sendResp.text();
      throw new Error(`send-otp failed: ${sendResp.status} ${err}`);
    }
    console.log('✅ OTP send endpoint responded OK');

    // Connect to DB and fetch OTP
    await connectDB();
    const user = await User.findOne({ email: targetEmail });
    if (!user) throw new Error('No user found after sending OTP');
    if (!user.otp || !user.otp.code) throw new Error('OTP not saved on user document');

    const otp = user.otp.code;
    console.log(`🔎 Found OTP in DB: ${otp} (expires: ${user.otp.expiresAt.toISOString()})`);

    // Verify OTP
    console.log('🔐 Verifying OTP...');
    const verifyResp = await fetch(`${BASE_URL}/api/auth/email/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: targetEmail, otp })
    });
    if (!verifyResp.ok) {
      const err = await verifyResp.text();
      throw new Error(`verify-otp failed: ${verifyResp.status} ${err}`);
    }
    const verifyData = await verifyResp.json();
    if (!verifyData.token) throw new Error('No token returned from verify endpoint');
    console.log('✅ OTP verified. JWT received.');
    console.log(`👤 User verified: ${verifyData.user?.isVerified}, email: ${verifyData.user?.email}`);

    console.log('\n🎉 Email OTP flow test (fetch) passed');
  } catch (error) {
    console.error('❌ Email OTP flow test (fetch) failed:', error.message);
  } finally {
    process.exit(0);
  }
}

if (require.main === module) {
  runEmailOtpFlowFetch();
}

module.exports = { runEmailOtpFlowFetch };

