const mongoose = require('mongoose');
const { USER_ROLES, USER_STATUS } = require('../constants/enums');

/**
 * User Schema
 * Represents authenticated operators, administrators, merchants, and support personnel.
 * Supports RBAC, enterprise lockouts, and multi-tenant merchant association.
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'User name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email address',
      ],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false, // Prevents accidental exposure in query projections
    },
    role: {
      type: String,
      enum: {
        values: Object.values(USER_ROLES),
        message: 'Invalid role: {VALUE}. Must be one of ' + Object.values(USER_ROLES).join(', '),
      },
      required: [true, 'User role is required'],
      default: USER_ROLES.MERCHANT,
    },
    status: {
      type: String,
      enum: {
        values: Object.values(USER_STATUS),
        message: 'Invalid user status: {VALUE}',
      },
      required: [true, 'User status is required'],
      default: USER_STATUS.ACTIVE,
    },
    merchant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Merchant',
      default: null,
      validate: {
        validator: function (value) {
          // If role is MERCHANT, merchant reference should be present
          if (this.role === USER_ROLES.MERCHANT && !value) {
            return false;
          }
          return true;
        },
        message: 'Merchant reference is required for users with role MERCHANT',
      },
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
      min: [0, 'Failed login attempts cannot be negative'],
    },
    lastPasswordChange: {
      type: Date,
      default: Date.now,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes
userSchema.index({ role: 1, status: 1 });
userSchema.index({ merchant: 1 });

const User = mongoose.model('User', userSchema);

module.exports = User;
