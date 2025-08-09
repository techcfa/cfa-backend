require('dotenv').config();
const connectDB = require('../config/database');
const User = require('../models/User');

(async () => {
  try {
    const email = process.argv[2];
    if (!email) {
      console.error('Usage: node scripts/printOtp.js <email>');
      process.exit(1);
    }

    // Silence console.log during DB connect to avoid polluting output
    const originalLog = console.log;
    console.log = () => {};
    await connectDB();
    console.log = originalLog;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      process.stdout.write('USER_NOT_FOUND');
      process.exit(0);
    }

    if (!user.otp || !user.otp.code) {
      process.stdout.write('NO_OTP');
      process.exit(0);
    }

    // Print only the OTP code for easy capture in shell (no extra newline)
    process.stdout.write(user.otp.code);
    process.exit(0);
  } catch (err) {
    console.error('ERROR', err.message);
    process.exit(1);
  }
})();

