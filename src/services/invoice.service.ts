import HttpError from '../errors/http-error';
import InvoiceModel, { type InvoiceDocument } from '../models/invoice.model';
import MerchantModel from '../models/merchant.model';
import { calculateInvoiceAmounts, minorUnitsToDecimalString } from '../utils/money';
import type { CreateInvoiceInput } from '../validators/invoice.validator';

export interface InvoiceResponse {
  invoiceId: string;
  merchantId: string;
  amount: string;
  currency: string;
  feePercent: string;
  fee: string;
  amountToReceive: string;
  status: string;
}

function normalizeCurrency(currency: string): string {
  return currency.trim().toUpperCase();
}

export function mapInvoiceResponse(invoice: InvoiceDocument): InvoiceResponse {
  return {
    invoiceId: String(invoice._id),
    merchantId: invoice.merchantId,
    amount: minorUnitsToDecimalString(invoice.amountMinor, invoice.currencyScale),
    currency: invoice.currency,
    feePercent: invoice.feePercent,
    fee: minorUnitsToDecimalString(invoice.feeMinor, invoice.currencyScale),
    amountToReceive: minorUnitsToDecimalString(invoice.amountToReceiveMinor, invoice.currencyScale),
    status: invoice.status,
  };
}

export async function createInvoice({
  amount,
  currency,
  merchantId,
}: CreateInvoiceInput): Promise<InvoiceResponse> {
  const merchant = await MerchantModel.findOne({ merchantId }).lean().exec();

  if (!merchant) {
    throw new HttpError(404, 'Merchant not found');
  }

  const currencyCode = normalizeCurrency(currency);
  const amounts = calculateInvoiceAmounts({
    amount,
    currency: currencyCode,
    feePercent: merchant.feePercent,
  });

  const invoice = await InvoiceModel.create({
    merchantId,
    currency: currencyCode,
    currencyScale: amounts.currencyScale,
    amountMinor: amounts.amountMinor,
    feePercent: amounts.feePercent,
    feeMinor: amounts.feeMinor,
    amountToReceiveMinor: amounts.amountToReceiveMinor,
    status: 'pending',
  });

  return mapInvoiceResponse(invoice);
}
