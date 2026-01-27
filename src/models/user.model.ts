import { Schema, model } from 'mongoose';

const userSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'superadmin'],
  },
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  name: {
    type: String,
  },
  twoFAEnabled: {
    type: Boolean,
    default: false,
  },
  twoFASecret: {
    type: String,
    default: undefined,
  },
  tokenVersion: {
    type: Number,
    default: 0,
  },
  resetPasswordToken: {
    type: String,
    default: undefined,
  },
  resetPasswordExpires: {
    type: Date,
    default: undefined,
  },
}, {
  timestamps: true,
});

export const User = model('User', userSchema)