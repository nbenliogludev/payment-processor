import { Schema, model } from 'mongoose';

export interface Merchant {
  merchantId: string;
  feePercent: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const merchantSchema = new Schema<Merchant>(
  {
    merchantId: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    feePercent: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

const MerchantModel = model<Merchant>('Merchant', merchantSchema);

export default MerchantModel;
