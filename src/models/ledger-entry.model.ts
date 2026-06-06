import { Schema, model, type HydratedDocument } from 'mongoose';

export interface LedgerEntry {
  invoiceId: string;
  merchantId: string;
  currency: string;
  currencyScale: number;
  amountMinor: string;
  type: 'payment_received';
  createdAt?: Date;
  updatedAt?: Date;
}

export type LedgerEntryDocument = HydratedDocument<LedgerEntry>;

const ledgerEntrySchema = new Schema<LedgerEntry>(
  {
    invoiceId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
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
      index: true,
    },
    currencyScale: {
      type: Number,
      required: true,
      min: 0,
    },
    amountMinor: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['payment_received'],
      default: 'payment_received',
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

const LedgerEntryModel = model<LedgerEntry>('LedgerEntry', ledgerEntrySchema);

export default LedgerEntryModel;
