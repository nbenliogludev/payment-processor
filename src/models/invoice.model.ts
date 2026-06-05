import { Schema, model, type HydratedDocument } from 'mongoose';

export type InvoiceStatus = 'pending' | 'paid' | 'failed';

export interface Invoice {
  merchantId: string;
  currency: string;
  currencyScale: number;
  amountMinor: string;
  feePercent: string;
  feeMinor: string;
  amountToReceiveMinor: string;
  status: InvoiceStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export type InvoiceDocument = HydratedDocument<Invoice>;

const invoiceSchema = new Schema<Invoice>(
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
    feePercent: {
      type: String,
      required: true,
    },
    feeMinor: {
      type: String,
      required: true,
    },
    amountToReceiveMinor: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

const InvoiceModel = model<Invoice>('Invoice', invoiceSchema);

export default InvoiceModel;
