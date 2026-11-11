import mongoose, { Schema, Document } from 'mongoose';

export interface IRoom extends Document {
  roomId: string;
  name: string;
  description: string;
  isDefault: boolean;
  createdAt: Date;
}

const RoomSchema: Schema = new Schema(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const Room = mongoose.model<IRoom>('Room', RoomSchema);

/**
 * Seed default rooms on application startup
 */
export async function seedDefaultRooms() {
  const defaultRooms = [
    { roomId: 'general', name: 'General Chat', description: 'Kênh chat chung toàn hệ thống', isDefault: true },
    { roomId: 'devops', name: 'DevOps & SRE', description: 'Thảo luận CI/CD, Terraform, Kubernetes', isDefault: true },
    { roomId: 'kubernetes', name: 'K8s Cluster', description: 'Trao đổi về Pods, HPA, Redis Pub/Sub', isDefault: true },
    { roomId: 'random', name: 'Random & Coffee', description: 'Góc giải trí công nghệ', isDefault: true },
  ];

  for (const r of defaultRooms) {
    await Room.findOneAndUpdate(
      { roomId: r.roomId },
      { $setOnInsert: r },
      { upsert: true, new: true }
    );
  }
}
