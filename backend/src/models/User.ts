import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  username: string;
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
    avatar: {
      type: String,
      default: 'https://api.dicebear.com/7.x/bottts/svg?seed=devops',
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
  }
);

export const User = mongoose.model<IUser>('User', UserSchema);
