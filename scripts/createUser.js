const mongoose = require('mongoose');
const User = require('../models/User');

async function main() {
  const [,, emailArg, passwordArg, fullNameArg] = process.argv;
  if (!emailArg || !passwordArg) {
    console.error('Usage: node scripts/createUser.js <email> <password> [fullName]');
    process.exit(1);
  }
  const fullName = fullNameArg || emailArg.split('@')[0];

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI env not set');
    process.exit(1);
  }

  await mongoose.connect(uri);
  try {
    let user = await User.findOne({ email: emailArg });
    if (!user) {
      user = new User({ fullName, email: emailArg, password: passwordArg, isVerified: true });
    } else {
      user.fullName = fullName;
      user.password = passwordArg; // hashed by pre-save hook
      user.isVerified = true;
    }
    await user.save();
    console.log('User upserted:', { id: user._id.toString(), email: user.email, customerId: user.customerId, isVerified: user.isVerified });
  } catch (e) {
    console.error('Error creating user:', e);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

main();