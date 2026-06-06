const mockMerchantFindOne = jest.fn();
const mockInvoiceCreate = jest.fn();
const mockInvoiceFindById = jest.fn();

jest.mock('../src/models/merchant.model', () => ({
  __esModule: true,
  default: {
    findOne: (...args: unknown[]) => mockMerchantFindOne(...args),
  },
}));

jest.mock('../src/models/invoice.model', () => ({
  __esModule: true,
  default: {
    create: (...args: unknown[]) => mockInvoiceCreate(...args),
    findById: (...args: unknown[]) => mockInvoiceFindById(...args),
  },
}));

import app from '../src/app';
import { invokeApp } from './helpers/invoke-app';

const invoiceId = '665f6f1e8b3f3d49e57a6e11';
const missingInvoiceId = '665f6f1e8b3f3d49e57a6e12';

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

function leanQuery<T>(value: T) {
  return {
    lean: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(value),
    }),
  };
}

function execQuery<T>(value: T) {
  return {
    exec: jest.fn().mockResolvedValue(value),
  };
}

function makeInvoice(overrides: Partial<MockInvoice> = {}): MockInvoice {
  return {
    _id: invoiceId,
    merchantId: 'merchant-1',
    currency: 'USD',
    currencyScale: 2,
    amountMinor: '10000',
    feePercent: '2.5',
    feeMinor: '250',
    amountToReceiveMinor: '9750',
    status: 'pending',
    ...overrides,
  };
}

function bodyAs<T>(response: { body: unknown }): T {
  return response.body as T;
}

function mockMerchant(feePercent = '2.5'): void {
  mockMerchantFindOne.mockReturnValue(leanQuery({ merchantId: 'merchant-1', feePercent }));
}

function mockInvoiceCreation(): void {
  mockInvoiceCreate.mockImplementation(async (payload: Partial<MockInvoice>) =>
    makeInvoice({ _id: invoiceId, ...payload }),
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockInvoiceCreation();
});

describe('POST /invoice', () => {
  it('creates a pending invoice with calculated fee and amount to receive', async () => {
    mockMerchant();

    const response = await invokeApp(app, {
      method: 'POST',
      path: '/invoice',
      body: {
        amount: '100.00',
        currency: 'usd',
        merchantId: 'merchant-1',
      },
    });

    expect(response.status).toBe(201);
    expect(bodyAs<ApiResponse<MockInvoice>>(response).data).toEqual({
      invoiceId,
      merchantId: 'merchant-1',
      amount: '100.00',
      currency: 'USD',
      feePercent: '2.5',
      fee: '2.50',
      amountToReceive: '97.50',
      status: 'pending',
    });
    expect(mockInvoiceCreate).toHaveBeenCalledWith({
      merchantId: 'merchant-1',
      currency: 'USD',
      currencyScale: 2,
      amountMinor: '10000',
      feePercent: '2.5',
      feeMinor: '250',
      amountToReceiveMinor: '9750',
      status: 'pending',
    });
  });

  it('uses currency-specific minor units and rounding rules', async () => {
    mockMerchant();

    const response = await invokeApp(app, {
      method: 'POST',
      path: '/invoice',
      body: {
        amount: '10.123',
        currency: 'KWD',
        merchantId: 'merchant-1',
      },
    });

    expect(response.status).toBe(201);
    expect(bodyAs<ApiResponse<MockInvoice>>(response).data).toEqual({
      invoiceId,
      merchantId: 'merchant-1',
      amount: '10.123',
      currency: 'KWD',
      feePercent: '2.5',
      fee: '0.253',
      amountToReceive: '9.870',
      status: 'pending',
    });
    expect(mockInvoiceCreate).toHaveBeenCalledWith(
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
    mockMerchant();

    const response = await invokeApp(app, {
      method: 'POST',
      path: '/invoice',
      body: {
        amount: '100',
        currency: 'JPY',
        merchantId: 'merchant-1',
      },
    });

    expect(response.status).toBe(201);
    expect(bodyAs<ApiResponse<MockInvoice>>(response).data).toEqual(
      expect.objectContaining({
        amount: '100',
        currency: 'JPY',
        fee: '3',
        amountToReceive: '97',
      }),
    );
  });

  it('returns 404 when merchant settings are missing', async () => {
    mockMerchantFindOne.mockReturnValue(leanQuery(null));

    const response = await invokeApp(app, {
      method: 'POST',
      path: '/invoice',
      body: {
        amount: '100.00',
        currency: 'USD',
        merchantId: 'unknown-merchant',
      },
    });

    expect(response.status).toBe(404);
    expect(bodyAs<ApiErrorResponse>(response).error.message).toBe('Merchant not found');
  });

  it('rejects amounts with more than two decimal places', async () => {
    mockMerchant();

    const response = await invokeApp(app, {
      method: 'POST',
      path: '/invoice',
      body: {
        amount: '100.001',
        currency: 'USD',
        merchantId: 'merchant-1',
      },
    });

    expect(response.status).toBe(400);
    expect(bodyAs<ApiErrorResponse>(response).error.message).toBe(
      'amount must have at most 2 decimal places',
    );
  });

  it('rejects invalid request bodies', async () => {
    const response = await invokeApp(app, {
      method: 'POST',
      path: '/invoice',
      body: {
        amount: '',
        currency: 'US',
        merchantId: '',
      },
    });

    expect(response.status).toBe(400);
    expect(bodyAs<ApiErrorResponse>(response).error.message).toBe('Invalid request body');
    expect(bodyAs<ApiErrorResponse>(response).error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'currency' }),
        expect.objectContaining({ path: 'merchantId' }),
      ]),
    );
    expect(mockMerchantFindOne).not.toHaveBeenCalled();
  });

  it('rejects numeric amounts and non-letter currency codes', async () => {
    const response = await invokeApp(app, {
      method: 'POST',
      path: '/invoice',
      body: {
        amount: 100,
        currency: '123',
        merchantId: 'merchant-1',
      },
    });

    expect(response.status).toBe(400);
    expect(bodyAs<ApiErrorResponse>(response).error.details).toEqual(
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
    mockMerchant();

    const response = await invokeApp(app, {
      method: 'POST',
      path: '/invoice',
      body: {
        amount: '100.00',
        currency: 'BTC',
        merchantId: 'merchant-1',
      },
    });

    expect(response.status).toBe(400);
    expect(bodyAs<ApiErrorResponse>(response).error.message).toBe('Unsupported currency: BTC');
  });
});

describe('GET /invoice/:id', () => {
  it('returns current invoice status and calculated amounts', async () => {
    mockInvoiceFindById.mockReturnValue(execQuery(makeInvoice()));

    const response = await invokeApp(app, {
      method: 'GET',
      path: `/invoice/${invoiceId}`,
    });

    expect(response.status).toBe(200);
    expect(bodyAs<ApiResponse<MockInvoice>>(response).data).toEqual({
      invoiceId,
      merchantId: 'merchant-1',
      amount: '100.00',
      currency: 'USD',
      feePercent: '2.5',
      fee: '2.50',
      amountToReceive: '97.50',
      status: 'pending',
    });
  });

  it('returns 404 when invoice does not exist', async () => {
    mockInvoiceFindById.mockReturnValue(execQuery(null));

    const response = await invokeApp(app, {
      method: 'GET',
      path: `/invoice/${missingInvoiceId}`,
    });

    expect(response.status).toBe(404);
    expect(bodyAs<ApiErrorResponse>(response).error.message).toBe('Invoice not found');
  });

  it('returns 400 for invalid invoice ids', async () => {
    const response = await invokeApp(app, {
      method: 'GET',
      path: '/invoice/not-a-valid-id',
    });

    expect(response.status).toBe(400);
    expect(bodyAs<ApiErrorResponse>(response).error.message).toBe('Invalid invoice id');
    expect(mockInvoiceFindById).not.toHaveBeenCalled();
  });
});
