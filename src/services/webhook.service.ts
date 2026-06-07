import mongoose from 'mongoose';

import HttpError from '../errors/http-error';
import InvoiceModel, { type InvoiceDocument } from '../models/invoice.model';
import LedgerEntryModel from '../models/ledger-entry.model';
import MerchantBalanceModel from '../models/merchant-balance.model';
import { mapInvoiceResponse, type InvoiceResponse } from './invoice.service';
import type { WebhookInput } from '../validators/webhook.validator';

async function creditMerchantBalance(
  invoice: InvoiceDocument,
  session: mongoose.ClientSession,
): Promise<void> {
  await LedgerEntryModel.create(
    [
      {
        invoiceId: String(invoice._id),
        merchantId: invoice.merchantId,
        currency: invoice.currency,
        currencyScale: invoice.currencyScale,
        amountMinor: invoice.amountToReceiveMinor,
        type: 'payment_received',
      },
    ],
    { session },
  );

  await MerchantBalanceModel.findOneAndUpdate(
    { merchantId: invoice.merchantId, currency: invoice.currency },
    {
      $inc: { amountMinor: Number(invoice.amountToReceiveMinor) },
      $setOnInsert: {
        merchantId: invoice.merchantId,
        currency: invoice.currency,
        currencyScale: invoice.currencyScale,
      },
    },
    { upsert: true, session },
  );
}

async function mapExistingInvoice(invoiceId: string): Promise<InvoiceResponse> {
  const invoice = await InvoiceModel.findById(invoiceId).exec();

  if (!invoice) {
    throw new HttpError(404, 'Invoice not found');
  }

  return mapInvoiceResponse(invoice);
}

export async function processWebhookStatus({
  invoiceId,
  status,
}: WebhookInput): Promise<InvoiceResponse> {
  if (!mongoose.isValidObjectId(invoiceId)) {
    throw new HttpError(400, 'Invalid invoice id');
  }

  const session = await mongoose.startSession();
  let response: InvoiceResponse | undefined;

  try {
    // withTransaction automatically retries the callback on TransientTransactionError (e.g. WriteConflict).
    // If two identical webhooks start concurrently, one will win and save the invoice status to 'paid'.
    // The other will get a write conflict, retry the transaction, read the updated 'paid' status,
    // and safely return the current state without double-crediting.
    await session.withTransaction(async () => {
      const invoice = await InvoiceModel.findById(invoiceId).session(session).exec();

      if (!invoice) {
        throw new HttpError(404, 'Invoice not found');
      }

      if (invoice.status === status) {
        response = mapInvoiceResponse(invoice);
        return;
      }

      if (invoice.status !== 'pending') {
        throw new HttpError(409, 'Invoice already has a final status');
      }

      invoice.status = status;
      await invoice.save({ session });

      if (status === 'paid') {
        await creditMerchantBalance(invoice, session);
      }

      response = mapInvoiceResponse(invoice);
    });
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 11000) {
      return mapExistingInvoice(invoiceId);
    }

    throw error;
  } finally {
    await session.endSession();
  }

  if (!response) {
    throw new HttpError(500, 'Webhook processing failed');
  }

  return response;
}
