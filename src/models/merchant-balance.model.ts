import { Schema, model, type HydratedDocument } from 'mongoose';

export interface MerchantBalance {
  merchantId: string;
  currency: string;
  currencyScale: number;
  amountMinor: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export type MerchantBalanceDocument = HydratedDocument<MerchantBalance>;

const merchantBalanceSchema = new Schema<MerchantBalance>(
  {
    merchantId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      minlength: 3,
      maxlength: 3,
    },
    currencyScale: {
      type: Number,
      required: true,
      min: 0,
    },
    amountMinor: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

merchantBalanceSchema.index({ merchantId: 1, currency: 1 }, { unique: true });

const MerchantBalanceModel = model<MerchantBalance>('MerchantBalance', merchantBalanceSchema);

export default MerchantBalanceModel;
