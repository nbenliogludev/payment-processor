import crypto from 'crypto';

const mockRedisSet = jest.fn();
const mockMongooseStartSession = jest.fn();
const mockInvoiceFindById = jest.fn();
const mockLedgerEntryCreate = jest.fn();
const mockMerchantBalanceFindOneAndUpdate = jest.fn();

jest.mock('mongoose', () => {
  const actual = jest.requireActual<typeof import('mongoose')>('mongoose');
  const mongooseDefault = actual.default;

  return {
    __esModule: true,
    ...actual,
    default: {
      ...mongooseDefault,
      isValidObjectId: actual.isValidObjectId,
      startSession: (...args: unknown[]) => mockMongooseStartSession(...args),
    },
  };
});

jest.mock('../src/config/redis', () => ({
  getRedisClient: () => ({
    set: mockRedisSet,
  }),
}));

jest.mock('../src/models/invoice.model', () => ({
  __esModule: true,
  default: {
    findById: (...args: unknown[]) => mockInvoiceFindById(...args),
  },
}));

jest.mock('../src/models/ledger-entry.model', () => ({
  __esModule: true,
  default: {
    create: (...args: unknown[]) => mockLedgerEntryCreate(...args),
  },
}));

jest.mock('../src/models/merchant-balance.model', () => ({
  __esModule: true,
  default: {
    findOneAndUpdate: (...args: unknown[]) => mockMerchantBalanceFindOneAndUpdate(...args),
  },
}));

import app from '../src/app';
import { createWebhookSignature, verifyWebhookSecurity } from '../src/services/webhook-security.service';
import { processWebhookStatus } from '../src/services/webhook.service';
import { invokeApp } from './helpers/invoke-app';

const invoiceId = '665f6f1e8b3f3d49e57a6e11';
const missingInvoiceId = '665f6f1e8b3f3d49e57a6e12';

interface MockSession {
  withTransaction: jest.Mock;
  endSession: jest.Mock;
}

interface MockInvoice {
  _id: string;
  merchantId: string;
  currency: string;
  currencyScale: number;
  amountMinor: string;
  feePercent: string;
  feeMinor: string;
  amountToReceiveMinor: string;
  status: 'pending' | 'paid' | 'failed';
  save: jest.Mock<Promise<void>, [unknown?]>;
}


interface ApiResponse<T> {
  data: T;
}

interface ApiErrorResponse {
  error: {
    message: string;
    details?: Array<{ path: string; message: string }>;
  };
}

function bodyAs<T>(response: { body: unknown }): T {
  return response.body as T;
}

function sessionQuery<T>(value: T) {
  return {
    session: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(value),
    }),
    exec: jest.fn().mockResolvedValue(value),
  };
}

function mockSession(runCallback = true): MockSession {
  const session: MockSession = {
    withTransaction: jest.fn(async (callback) => {
      if (runCallback) {
        await callback();
      }
    }),
    endSession: jest.fn(async () => undefined),
  };

  mockMongooseStartSession.mockResolvedValue(session);

  return session;
}

function makeInvoice(status: MockInvoice['status'] = 'pending'): MockInvoice {
  return {
    _id: invoiceId,
    merchantId: 'merchant-1',
    currency: 'USD',
    currencyScale: 2,
    amountMinor: '10000',
    feePercent: '2.5',
    feeMinor: '250',
    amountToReceiveMinor: '9750',
    status,
    save: jest.fn(async function saveInvoice(this: MockInvoice) {
      return undefined;
    }),
  };
}


function signedWebhookRequest(
  payload: Record<string, unknown>,
  {
    nonce = crypto.randomUUID(),
    timestamp = Date.now().toString(),
    signature,
  }: {
    nonce?: string;
    timestamp?: string;
    signature?: string;
  } = {},
) {
  const rawBody = Buffer.from(JSON.stringify(payload));

  return invokeApp(app, {
    method: 'POST',
    path: '/webhook',
    body: rawBody,
    headers: {
      'Content-Type': 'application/json',
      'X-Timestamp': timestamp,
      'X-Nonce': nonce,
      'X-Signature': signature ?? createWebhookSignature(rawBody),
    },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRedisSet.mockResolvedValue('OK');
  mockLedgerEntryCreate.mockResolvedValue(undefined);
  mockMerchantBalanceFindOneAndUpdate.mockResolvedValue(null);
  mockSession();
});

describe('POST /webhook', () => {
  it('marks an invoice as paid and credits merchant balance exactly once', async () => {
    const invoice = makeInvoice();
    const payload = { invoiceId, status: 'paid' };

    mockInvoiceFindById.mockReturnValue(sessionQuery(invoice));

    const firstResponse = await signedWebhookRequest(payload, { nonce: 'nonce-1' });
    const secondResponse = await signedWebhookRequest(payload, { nonce: 'nonce-2' });

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(bodyAs<ApiResponse<MockInvoice>>(firstResponse).data.status).toBe('paid');
    expect(bodyAs<ApiResponse<MockInvoice>>(secondResponse).data.status).toBe('paid');
    expect(invoice.save).toHaveBeenCalledTimes(1);
    expect(mockLedgerEntryCreate).toHaveBeenCalledTimes(1);
    expect(mockLedgerEntryCreate).toHaveBeenCalledWith(
      [
        {
          invoiceId,
          merchantId: 'merchant-1',
          currency: 'USD',
          currencyScale: 2,
          amountMinor: '9750',
          type: 'payment_received',
        },
      ],
      { session: expect.any(Object) },
    );
    expect(mockMerchantBalanceFindOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(mockMerchantBalanceFindOneAndUpdate).toHaveBeenCalledWith(
      { merchantId: 'merchant-1', currency: 'USD' },
      {
        $inc: { amountMinor: 9750 },
        $setOnInsert: { merchantId: 'merchant-1', currency: 'USD', currencyScale: 2 },
      },
      { upsert: true, session: expect.any(Object) },
    );
  });

  it('adds paid amount to an existing merchant balance atomically', async () => {
    const invoice = makeInvoice();

    mockInvoiceFindById.mockReturnValue(sessionQuery(invoice));

    const response = await signedWebhookRequest({ invoiceId, status: 'paid' });

    expect(response.status).toBe(200);
    expect(mockMerchantBalanceFindOneAndUpdate).toHaveBeenCalledWith(
      { merchantId: 'merchant-1', currency: 'USD' },
      expect.objectContaining({ $inc: { amountMinor: 9750 } }),
      expect.objectContaining({ upsert: true }),
    );
  });

  it('marks an invoice as failed without crediting merchant balance', async () => {
    const invoice = makeInvoice();
    mockInvoiceFindById.mockReturnValue(sessionQuery(invoice));

    const response = await signedWebhookRequest({
      invoiceId,
      status: 'failed',
    });

    expect(response.status).toBe(200);
    expect(bodyAs<ApiResponse<MockInvoice>>(response).data.status).toBe('failed');
    expect(mockLedgerEntryCreate).not.toHaveBeenCalled();
    expect(mockMerchantBalanceFindOneAndUpdate).not.toHaveBeenCalled();
  });

  it('rejects unsigned webhook requests before validating the body', async () => {
    const response = await invokeApp(app, {
      method: 'POST',
      path: '/webhook',
      body: {
        invoiceId: '',
        status: 'processing',
      },
    });

    expect(response.status).toBe(401);
    expect(bodyAs<ApiErrorResponse>(response).error.message).toBe('Missing webhook signature');
    expect(mockRedisSet).not.toHaveBeenCalled();
    expect(mockMongooseStartSession).not.toHaveBeenCalled();
  });

  it('rejects invalid webhook request bodies after security checks pass', async () => {
    const response = await signedWebhookRequest({
      invoiceId: '',
      status: 'processing',
    });

    expect(response.status).toBe(400);
    expect(bodyAs<ApiErrorResponse>(response).error.message).toBe('Invalid request body');
    expect(mockRedisSet).toHaveBeenCalledTimes(1);
    expect(mockMongooseStartSession).not.toHaveBeenCalled();
  });

  it('rejects invalid signatures before using nonce storage', async () => {
    const response = await signedWebhookRequest(
      {
        invoiceId,
        status: 'paid',
      },
      { signature: '00' },
    );

    expect(response.status).toBe(401);
    expect(bodyAs<ApiErrorResponse>(response).error.message).toBe('Invalid webhook signature');
    expect(mockRedisSet).not.toHaveBeenCalled();
    expect(mockMongooseStartSession).not.toHaveBeenCalled();
  });

  it('rejects timestamps outside the allowed window', async () => {
    const staleTimestamp = String(Date.now() - 10 * 60 * 1000);

    const response = await signedWebhookRequest(
      {
        invoiceId,
        status: 'paid',
      },
      { timestamp: staleTimestamp },
    );

    expect(response.status).toBe(401);
    expect(bodyAs<ApiErrorResponse>(response).error.message).toBe(
      'Webhook timestamp is outside the allowed window',
    );
    expect(mockRedisSet).not.toHaveBeenCalled();
  });

  it('rejects already used nonces', async () => {
    mockRedisSet.mockResolvedValue(null);

    const response = await signedWebhookRequest({
      invoiceId,
      status: 'paid',
    });

    expect(response.status).toBe(409);
    expect(bodyAs<ApiErrorResponse>(response).error.message).toBe(
      'Webhook nonce has already been used',
    );
  });

  it('rejects invalid invoice ids after security checks pass', async () => {
    const response = await signedWebhookRequest({
      invoiceId: 'not-a-valid-id',
      status: 'paid',
    });

    expect(response.status).toBe(400);
    expect(bodyAs<ApiErrorResponse>(response).error.message).toBe('Invalid invoice id');
    expect(mockMongooseStartSession).not.toHaveBeenCalled();
  });

  it('rejects missing invoices after security checks pass', async () => {
    mockInvoiceFindById.mockReturnValue(sessionQuery(null));

    const response = await signedWebhookRequest({
      invoiceId: missingInvoiceId,
      status: 'paid',
    });

    expect(response.status).toBe(404);
    expect(bodyAs<ApiErrorResponse>(response).error.message).toBe('Invoice not found');
  });

  it('rejects conflicting final statuses', async () => {
    const invoice = makeInvoice();
    mockInvoiceFindById.mockReturnValue(sessionQuery(invoice));

    await signedWebhookRequest(
      {
        invoiceId,
        status: 'paid',
      },
      { nonce: 'nonce-paid' },
    );

    const response = await signedWebhookRequest(
      {
        invoiceId,
        status: 'failed',
      },
      { nonce: 'nonce-failed' },
    );

    expect(response.status).toBe(409);
    expect(bodyAs<ApiErrorResponse>(response).error.message).toBe(
      'Invoice already has a final status',
    );
  });
});

describe('webhook service', () => {
  it('returns the existing invoice when the ledger unique key reports a duplicate credit', async () => {
    const invoice = makeInvoice();
    const duplicateKeyError = Object.assign(new Error('duplicate ledger entry'), { code: 11000 });

    mockInvoiceFindById
      .mockReturnValueOnce(sessionQuery(invoice))
      .mockReturnValueOnce(sessionQuery(invoice));
    mockLedgerEntryCreate.mockRejectedValueOnce(duplicateKeyError);

    const response = await processWebhookStatus({ invoiceId, status: 'paid' });

    expect(response.status).toBe('paid');
    expect(mockInvoiceFindById).toHaveBeenCalledTimes(2);
  });

  it('throws not found when duplicate credit fallback cannot find the invoice', async () => {
    const invoice = makeInvoice();
    const duplicateKeyError = Object.assign(new Error('duplicate ledger entry'), { code: 11000 });

    mockInvoiceFindById.mockReturnValueOnce(sessionQuery(invoice)).mockReturnValueOnce(
      sessionQuery(null),
    );
    mockLedgerEntryCreate.mockRejectedValueOnce(duplicateKeyError);

    await expect(processWebhookStatus({ invoiceId, status: 'paid' })).rejects.toThrow(
      'Invoice not found',
    );
  });

  it('throws if a transaction completes without a response', async () => {
    const session = mockSession(false);

    await expect(processWebhookStatus({ invoiceId, status: 'paid' })).rejects.toThrow(
      'Webhook processing failed',
    );
    expect(session.endSession).toHaveBeenCalled();
  });
});

describe('webhook security service', () => {
  it('accepts sha256-prefixed signatures and second-based timestamps', async () => {
    const rawBody = Buffer.from(JSON.stringify({ ok: true }));
    const signature = `sha256=${createWebhookSignature(rawBody)}`;
    const timestamp = Math.floor(Date.now() / 1000).toString();

    await expect(
      verifyWebhookSecurity({
        rawBody,
        signature,
        timestamp,
        nonce: 'security-nonce',
      }),
    ).resolves.toBeUndefined();
  });

  it('rejects missing security headers and invalid timestamps', async () => {
    const rawBody = Buffer.from('{}');
    const signature = createWebhookSignature(rawBody);

    await expect(verifyWebhookSecurity({ rawBody, signature, nonce: 'nonce' })).rejects.toThrow(
      'Missing webhook timestamp',
    );
    await expect(
      verifyWebhookSecurity({ rawBody, signature, timestamp: 'not-a-number', nonce: 'nonce' }),
    ).rejects.toThrow('Invalid webhook timestamp');
    await expect(
      verifyWebhookSecurity({ rawBody, timestamp: Date.now().toString(), nonce: 'nonce' }),
    ).rejects.toThrow('Missing webhook signature');
    await expect(
      verifyWebhookSecurity({
        rawBody,
        signature,
        timestamp: Date.now().toString(),
      }),
    ).rejects.toThrow('Missing webhook nonce');
  });

  it('rejects missing raw bodies', async () => {
    await expect(
      verifyWebhookSecurity({
        signature: '00',
        timestamp: Date.now().toString(),
        nonce: 'nonce',
      }),
    ).rejects.toThrow('Missing webhook raw body');
  });
});
