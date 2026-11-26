// models/User.js - Citizen & Admin User Model
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { PMC_WARDS } = require('./constants');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please enter full name'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please enter email address'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/,
        'Please provide a valid email address',
      ],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
    },
    ward: {
      type: String,
      required: [true, 'Please select your Pune ward office'],
      enum: {
        values: PMC_WARDS,
        message: '{VALUE} is not a recognized PMC ward office',
      },
    },
    phone: {
      type: String,
      trim: true,
      default: '',
      validate: {
        validator: function (v) {
          return !v || /^[6-9]\d{9}$/.test(v);
        },
        message: 'Please provide a valid 10-digit Indian mobile number',
      },
    },
    role: {
      type: String,
      enum: ['citizen', 'admin'],
      default: 'citizen',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    otp: {
      type: String,
      default: null,
    },
    otpExpiry: {
      type: Date,
      default: null,
    },
    otpAttempts: {
      type: Number,
      default: 0,
    },
    lastOtpSentAt: {
      type: Date,
      default: null,
    },
    points: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Method to verify password against stored passwordHash
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

// Virtual setter for password to auto-hash into passwordHash
userSchema.virtual('password').set(function (plainPassword) {
  this._plainPassword = plainPassword;
  this.passwordHash = bcrypt.hashSync(plainPassword, 10);
});

// Virtual helper for user civic badge level based on points
userSchema.virtual('civicLevel').get(function () {
  const pts = this.points || 0;
  if (pts >= 100) return 'Pune Civic Champion';
  if (pts >= 40) return 'Active Citizen';
  return 'Beginner';
});

// Exclude passwordHash and otp from JSON output by default
userSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret.passwordHash;
    delete ret.otp;
    delete ret.otpExpiry;
    delete ret.__v;
    return ret;
  },
});

userSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('User', userSchema);
