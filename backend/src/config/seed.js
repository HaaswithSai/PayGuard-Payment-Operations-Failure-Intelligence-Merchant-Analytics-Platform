const { User, Merchant } = require('../models');
const { hashPassword } = require('../utils/password');
const { connectDB } = require('./db');
const { USER_ROLES, USER_STATUS, MERCHANT_STATUS, PAYMENT_GATEWAYS } = require('../constants/enums');
const logger = require('../utils/logger');

const SEED_MERCHANTS = [
  {
    merchantCode: 'MCH_ACME_001',
    name: 'Acme Corporation',
    contactEmail: 'billing@acme.com',
    status: MERCHANT_STATUS.ACTIVE,
    configuration: {
      supportedGateways: [
        PAYMENT_GATEWAYS.STRIPE,
        PAYMENT_GATEWAYS.RAZORPAY,
        PAYMENT_GATEWAYS.ADYEN,
        PAYMENT_GATEWAYS.PAYPAL,
      ],
      defaultCurrency: 'USD',
      webhookSecret: 'whsec_simulated_test_secret_123',
    },
  },
  {
    merchantCode: 'MCH_GLOBEX_002',
    name: 'Globex Retail International',
    contactEmail: 'finance@globex.com',
    status: MERCHANT_STATUS.ACTIVE,
    configuration: {
      supportedGateways: [PAYMENT_GATEWAYS.STRIPE, PAYMENT_GATEWAYS.ADYEN],
      defaultCurrency: 'USD',
      webhookSecret: 'whsec_simulated_test_secret_123',
    },
  },
];

const SEED_ACCOUNTS = [
  {
    name: 'Super Administrator',
    email: 'admin@payguard.io',
    password: 'Admin@123456',
    role: USER_ROLES.ADMIN,
    status: USER_STATUS.ACTIVE,
  },
  {
    name: 'Support Operations',
    email: 'support@payguard.io',
    password: 'Support@123456',
    role: USER_ROLES.SUPPORT,
    status: USER_STATUS.ACTIVE,
  },
];

/**
 * Database Seeder: Provisions default Admin, Support, and Demo Merchants
 */
const seedSuperAdmin = async () => {
  try {
    // 1. Seed Demo Merchants
    for (const mch of SEED_MERCHANTS) {
      const existingMch = await Merchant.findOne({ merchantCode: mch.merchantCode });
      if (!existingMch) {
        await Merchant.create(mch);
        logger.info(`🎉 Provisioned demo merchant: ${mch.merchantCode} (${mch.name})`);
      }
    }

    // 2. Seed Demo Users
    for (const account of SEED_ACCOUNTS) {
      const existing = await User.findOne({ email: account.email, isDeleted: false });
      if (!existing) {
        const passwordHash = await hashPassword(account.password);
        await User.create({
          name: account.name,
          email: account.email,
          passwordHash,
          role: account.role,
          status: account.status,
          lastPasswordChange: new Date(),
        });
        logger.info(`🎉 Provisioned demo account: ${account.email} (${account.role})`);
      }
    }
  } catch (error) {
    logger.warn(`Initial seed notice: ${error.message}`);
  }
};

// Execute if run directly via CLI
if (require.main === module) {
  connectDB().then(async () => {
    await seedSuperAdmin();
    process.exit(0);
  });
}

module.exports = { seedSuperAdmin, SEED_ACCOUNTS, SEED_MERCHANTS };
