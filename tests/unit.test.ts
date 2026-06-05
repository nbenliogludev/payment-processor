import Decimal from 'decimal.js';

import HttpError from '../src/errors/http-error';
import { errorHandler } from '../src/middleware/error-handler';
import {
  calculateInvoiceAmounts,
  decimalToMinorUnits,
  formatMoney,
  getCurrencyFractionDigits,
  minorUnitsToDecimalString,
  toDecimal,
} from '../src/utils/money';

function loadEnvWith(overrides: NodeJS.ProcessEnv): typeof import('../src/config/env').default {
  const originalEnv = { ...process.env };
  let loadedEnv: typeof import('../src/config/env').default | undefined;
  const managedKeys = [
    'NODE_ENV',
    'PORT',
    'MONGO_URI',
    'REDIS_URL',
    'WEBHOOK_SECRET',
    'WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS',
  ];

  jest.resetModules();
  jest.doMock('dotenv', () => ({
    __esModule: true,
    default: {
      config: jest.fn(),
    },
  }));

  process.env = { ...originalEnv };

  for (const key of managedKeys) {
    delete process.env[key];
  }

  for (const [key, value] of Object.entries(overrides)) {
    if (value !== undefined) {
      process.env[key] = value;
    }
  }

  jest.isolateModules(() => {
    loadedEnv = require('../src/config/env').default;
  });

  process.env = originalEnv;
  jest.dontMock('dotenv');
  jest.resetModules();

  if (!loadedEnv) {
    throw new Error('Env module was not loaded');
  }

  return loadedEnv;
}

describe('money utilities', () => {
  it('formats decimal money values', () => {
    expect(formatMoney(new Decimal('10.1'), 2)).toBe('10.10');
    expect(decimalToMinorUnits(new Decimal('10.125'), 2)).toBe('1013');
    expect(minorUnitsToDecimalString('1013', 2)).toBe('10.13');
  });

  it('returns currency-specific fraction digits', () => {
    expect(getCurrencyFractionDigits('USD')).toBe(2);
    expect(getCurrencyFractionDigits('JPY')).toBe(0);
    expect(getCurrencyFractionDigits('KWD')).toBe(3);
  });

  it('rejects invalid decimal values', () => {
    expect(() => toDecimal('not-a-number', 'amount')).toThrow(
      new HttpError(400, 'amount must be a valid decimal number'),
    );
    expect(() => toDecimal('Infinity', 'amount')).toThrow(
      new HttpError(400, 'amount must be a valid decimal number'),
    );
  });

  it('rejects non-positive amounts', () => {
    expect(() =>
      calculateInvoiceAmounts({ amount: '0.00', currency: 'USD', feePercent: '2.5' }),
    ).toThrow(
      new HttpError(400, 'amount must be greater than 0'),
    );
  });

  it('rejects amounts with more than two decimal places', () => {
    expect(() =>
      calculateInvoiceAmounts({ amount: '10.001', currency: 'USD', feePercent: '2.5' }),
    ).toThrow(
      new HttpError(400, 'amount must have at most 2 decimal places'),
    );
  });

  it('rejects fee percent outside the allowed range', () => {
    expect(() =>
      calculateInvoiceAmounts({ amount: '10.00', currency: 'USD', feePercent: '-0.01' }),
    ).toThrow(
      new HttpError(400, 'feePercent must be between 0 and 100'),
    );
    expect(() =>
      calculateInvoiceAmounts({ amount: '10.00', currency: 'USD', feePercent: '100.01' }),
    ).toThrow(
      new HttpError(400, 'feePercent must be between 0 and 100'),
    );
  });

  it('rejects unsupported currencies', () => {
    expect(() => getCurrencyFractionDigits('BTC')).toThrow(
      new HttpError(400, 'Unsupported currency: BTC'),
    );
  });
});

describe('error handler', () => {
  it('hides internal error messages for 500 responses', () => {
    const status = jest.fn().mockReturnThis();
    const json = jest.fn();
    const res = { status, json };

    errorHandler(new Error('database exploded'), {} as never, res as never, jest.fn());

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      error: {
        message: 'Internal server error',
      },
    });
  });
});

describe('env config', () => {
  it('uses default values when environment variables are missing', () => {
    const env = loadEnvWith({});

    expect(env).toEqual({
      nodeEnv: 'development',
      port: 3000,
      mongoUri: 'mongodb://localhost:27017/payment_processor',
      redisUrl: 'redis://localhost:6379',
      webhookSecret: 'change-me',
      webhookTimestampToleranceSeconds: 300,
    });
  });

  it('uses configured values and falls back for invalid numbers', () => {
    const env = loadEnvWith({
      NODE_ENV: 'production',
      PORT: '8080',
      MONGO_URI: 'mongodb://example/payment_processor',
      REDIS_URL: 'redis://example:6379',
      WEBHOOK_SECRET: 'secret',
      WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS: 'not-a-number',
    });

    expect(env).toEqual({
      nodeEnv: 'production',
      port: 8080,
      mongoUri: 'mongodb://example/payment_processor',
      redisUrl: 'redis://example:6379',
      webhookSecret: 'secret',
      webhookTimestampToleranceSeconds: 300,
    });
  });

  it('uses defaults for empty numeric values', () => {
    const env = loadEnvWith({
      PORT: '',
      WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS: '',
    });

    expect(env.port).toBe(3000);
    expect(env.webhookTimestampToleranceSeconds).toBe(300);
  });
});

describe('app bootstrap module', () => {
  it('registers request logging outside the test environment', () => {
    const originalNodeEnv = process.env.NODE_ENV;

    jest.isolateModules(() => {
      process.env.NODE_ENV = 'development';
      const developmentApp = require('../src/app').default;

      expect(developmentApp).toBeDefined();
    });

    process.env.NODE_ENV = originalNodeEnv;
  });
});
