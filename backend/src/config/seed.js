const { User } = require('../models');
const { hashPassword } = require('../utils/password');
const { connectDB, disconnectDB } = require('./db');
const { USER_ROLES, USER_STATUS } = require('../constants/enums');
const logger = require('../utils/logger');

const DEFAULT_ADMIN = {
  name: 'PayGuard Super Admin',
  email: 'admin@payguard.internal',
  password: 'AdminPassword@2026!',
  role: USER_ROLES.ADMIN,
  status: USER_STATUS.ACTIVE,
};

/**
 * Database Seeder: Provisions the initial Super Admin account if none exists
 */
const seedSuperAdmin = async () => {
  try {
    await connectDB();

    const existingAdmin = await User.findOne({ role: USER_ROLES.ADMIN, isDeleted: false });

    if (existingAdmin) {
      logger.info(`Super Admin account already exists (${existingAdmin.email}). Skipping seed.`);
      await disconnectDB();
      return;
    }

    const passwordHash = await hashPassword(DEFAULT_ADMIN.password);

    const adminUser = await User.create({
      name: DEFAULT_ADMIN.name,
      email: DEFAULT_ADMIN.email,
      passwordHash,
      role: DEFAULT_ADMIN.role,
      status: DEFAULT_ADMIN.status,
      lastPasswordChange: new Date(),
    });

    logger.info('====================================================');
    logger.info('🎉 INITIAL SUPER ADMIN ACCOUNT PROVISIONED');
    logger.info(`👤 Email   : ${adminUser.email}`);
    logger.info(`🔑 Password: ${DEFAULT_ADMIN.password}`);
    logger.info(`🛡️ Role    : ${adminUser.role}`);
    logger.info('====================================================');

    await disconnectDB();
  } catch (error) {
    logger.error(`Failed to seed Super Admin: ${error.message}`, { error });
    process.exit(1);
  }
};

// Execute if run directly via CLI
if (require.main === module) {
  seedSuperAdmin().then(() => process.exit(0));
}

module.exports = { seedSuperAdmin, DEFAULT_ADMIN };
