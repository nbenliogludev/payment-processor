import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';

import app from '../src/app';
import InvoiceModel from '../src/models/invoice.model';
import MerchantModel from '../src/models/merchant.model';

let mongoServer: MongoMemoryServer | undefined;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({
    instance: {
      ip: '127.0.0.1',
    },
  });
  await mongoose.connect(mongoServer.getUri());
});

beforeEach(async () => {
  await Promise.all([InvoiceModel.deleteMany({}), MerchantModel.deleteMany({})]);
});

afterAll(async () => {
  await mongoose.disconnect();

  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('POST /invoice', () => {
  it('creates a pending invoice with calculated fee and amount to receive', async () => {
    await MerchantModel.create({
      merchantId: 'merchant-1',
      feePercent: '2.5',
    });

    const response = await request(app).post('/invoice').send({
      amount: '100.00',
      currency: 'usd',
      merchantId: 'merchant-1',
    });

    expect(response.status).toBe(201);
    expect(response.body.data).toEqual({
      invoiceId: expect.any(String),
      merchantId: 'merchant-1',
      amount: '100.00',
      currency: 'USD',
      feePercent: '2.5',
      fee: '2.50',
      amountToReceive: '97.50',
      status: 'pending',
    });

    const invoice = await InvoiceModel.findById(response.body.data.invoiceId).lean().exec();

    expect(invoice).toEqual(
      expect.objectContaining({
        merchantId: 'merchant-1',
        currency: 'USD',
        currencyScale: 2,
        amountMinor: '10000',
        feePercent: '2.5',
        feeMinor: '250',
        amountToReceiveMinor: '9750',
        status: 'pending',
      }),
    );
  });

  it('uses currency-specific minor units and rounding rules', async () => {
    await MerchantModel.create({
      merchantId: 'merchant-1',
      feePercent: '2.5',
    });

    const response = await request(app).post('/invoice').send({
      amount: '10.123',
      currency: 'KWD',
      merchantId: 'merchant-1',
    });

    expect(response.status).toBe(201);
    expect(response.body.data).toEqual({
      invoiceId: expect.any(String),
      merchantId: 'merchant-1',
      amount: '10.123',
      currency: 'KWD',
      feePercent: '2.5',
      fee: '0.253',
      amountToReceive: '9.870',
      status: 'pending',
    });

    const invoice = await InvoiceModel.findById(response.body.data.invoiceId).lean().exec();

    expect(invoice).toEqual(
      expect.objectContaining({
        currency: 'KWD',
        currencyScale: 3,
        amountMinor: '10123',
        feeMinor: '253',
        amountToReceiveMinor: '9870',
      }),
    );
  });

  it('supports zero-decimal currencies', async () => {
    await MerchantModel.create({
      merchantId: 'merchant-1',
      feePercent: '2.5',
    });

    const response = await request(app).post('/invoice').send({
      amount: '100',
      currency: 'JPY',
      merchantId: 'merchant-1',
    });

    expect(response.status).toBe(201);
    expect(response.body.data).toEqual(
      expect.objectContaining({
        amount: '100',
        currency: 'JPY',
        fee: '3',
        amountToReceive: '97',
      }),
    );
  });

  it('returns 404 when merchant settings are missing', async () => {
    const response = await request(app).post('/invoice').send({
      amount: '100.00',
      currency: 'USD',
      merchantId: 'unknown-merchant',
    });

    expect(response.status).toBe(404);
    expect(response.body.error.message).toBe('Merchant not found');
  });

  it('rejects amounts with more than two decimal places', async () => {
    await MerchantModel.create({
      merchantId: 'merchant-1',
      feePercent: '2.5',
    });

    const response = await request(app).post('/invoice').send({
      amount: '100.001',
      currency: 'USD',
      merchantId: 'merchant-1',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('amount must have at most 2 decimal places');
  });

  it('rejects invalid request bodies', async () => {
    const response = await request(app).post('/invoice').send({
      amount: '',
      currency: 'US',
      merchantId: '',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('Invalid request body');
    expect(response.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'currency' }),
        expect.objectContaining({ path: 'merchantId' }),
      ]),
    );
  });

  it('rejects numeric amounts and non-letter currency codes', async () => {
    const response = await request(app).post('/invoice').send({
      amount: 100,
      currency: '123',
      merchantId: 'merchant-1',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'amount' }),
        expect.objectContaining({
          path: 'currency',
          message: 'currency must be a 3-letter ISO currency code',
        }),
      ]),
    );
  });

  it('rejects unsupported currencies', async () => {
    await MerchantModel.create({
      merchantId: 'merchant-1',
      feePercent: '2.5',
    });

    const response = await request(app).post('/invoice').send({
      amount: '100.00',
      currency: 'BTC',
      merchantId: 'merchant-1',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('Unsupported currency: BTC');
  });
});
