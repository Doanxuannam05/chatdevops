import mongoose, { Schema, Document } from 'mongoose';

export interface IReaction {
  emoji: string;
  users: string[];
}

export interface IMessage extends Document {
  roomId: string;
  sender: string;
  avatar: string;
  text: string;
  senderPod: string;
  reactions: IReaction[];
  createdAt: Date;
}

const ReactionSchema = new Schema(
  {
    emoji: {
      type: String,
      required: true,
    },
    users: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

const MessageSchema: Schema = new Schema(
  {
    roomId: {
      type: String,
      required: true,
      index: true,
    },
    sender: {
      type: String,
      required: true,
      trim: true,
    },
    avatar: {
      type: String,
      default: 'https://api.dicebear.com/7.x/bottts/svg?seed=devops',
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    // Sender pod records which backend pod received the socket message
    // proving multi-pod synchronization via Redis Pub/Sub
    senderPod: {
      type: String,
      required: true,
      index: true,
    },
    reactions: {
      type: [ReactionSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient message loading by room in reverse chronological order
MessageSchema.index({ roomId: 1, createdAt: -1 });

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
