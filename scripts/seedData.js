const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const Subscription = require('../models/Subscription');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cfa-backend');
    console.log('MongoDB Connected for seeding');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    process.exit(1);
  }
};

const seedAdmin = async () => {
  try {
    const adminExists = await Admin.findOne({ username: 'admin' });
    if (!adminExists) {
      const admin = new Admin({
        username: 'admin',
        email: 'admin@cfa.com',
        password: 'admin123',
        role: 'super_admin'
      });
      await admin.save();
      console.log('Admin user created successfully');
    } else {
      console.log('Admin user already exists');
    }
  } catch (error) {
    console.error('Error creating admin:', error);
  }
};

const seedSubscriptions = async () => {
  try {
    const plans = [
      {
        planId: 'basic',
        planName: 'Basic Plan',
        description: 'Basic cyber fraud awareness protection for individuals',
        price: 999,
        duration: 12,
        maxMembers: 1,
        features: [
          '24/7 Helpline Support',
          'Cyber Awareness Articles',
          'Fraud Alert Notifications',
          'Basic Consultation'
        ]
      },
      {
        planId: 'family',
        planName: 'Family Plan',
        description: 'Comprehensive protection for families up to 4 members',
        price: 2499,
        duration: 12,
        maxMembers: 4,
        features: [
          '24/7 Helpline Support',
          'Cyber Awareness Articles',
          'Fraud Alert Notifications',
          'Priority Consultation',
          'Family Member Management',
          'Group Training Sessions'
        ]
      },
      {
        planId: 'premium',
        planName: 'Premium Plan',
        description: 'Premium protection with advanced features',
        price: 4999,
        duration: 12,
        maxMembers: 6,
        features: [
          '24/7 Helpline Support',
          'Cyber Awareness Articles',
          'Fraud Alert Notifications',
          'Priority Consultation',
          'Family Member Management',
          'Group Training Sessions',
          'Personal Cyber Security Audit',
          'Emergency Response Team'
        ]
      }
    ];

    for (const plan of plans) {
      const existingPlan = await Subscription.findOne({ planId: plan.planId });
      if (!existingPlan) {
        const subscription = new Subscription(plan);
        await subscription.save();
        console.log(`Plan ${plan.planName} created successfully`);
      } else {
        console.log(`Plan ${plan.planName} already exists`);
      }
    }
  } catch (error) {
    console.error('Error creating subscriptions:', error);
  }
};

const seedData = async () => {
  await connectDB();
  await seedAdmin();
  await seedSubscriptions();
  console.log('Seeding completed');
  process.exit(0);
};

seedData(); 