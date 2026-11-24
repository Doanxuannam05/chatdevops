import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  username: string;
  password?: string;
  avatar: string;
  isOnline: boolean;
  currentRoom?: string;
  lastSeen: Date;
}

const UserSchema: Schema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: false,
      select: false,
    },
    avatar: {
      type: String,
      default: '1',
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    currentRoom: {
      type: String,
      default: 'general',
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.password;
        return ret;
      },
    },
  }
);

export const User = mongoose.model<IUser>('User', UserSchema);
