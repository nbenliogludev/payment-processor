import Decimal from 'decimal.js';

import HttpError from '../errors/http-error';

Decimal.set({
  precision: 60,
  rounding: Decimal.ROUND_HALF_UP,
});

const CURRENCY_FRACTION_DIGITS: Record<string, number> = {
  EUR: 2,
  GBP: 2,
  JPY: 0,
  KWD: 3,
  RUB: 2,
  TRY: 2,
  USD: 2,
};

export interface InvoiceAmounts {
  amount: string;
  amountMinor: string;
  currencyScale: number;
  feePercent: string;
  fee: string;
  feeMinor: string;
  amountToReceive: string;
  amountToReceiveMinor: string;
}

export function toDecimal(value: string | number, fieldName: string): Decimal {
  try {
    const decimal = new Decimal(String(value));

    if (!decimal.isFinite()) {
      throw new Error('Not finite');
    }

    return decimal;
  } catch (_error) {
    throw new HttpError(400, `${fieldName} must be a valid decimal number`);
  }
}

function ensureDecimalScale(
  decimal: Decimal,
  fieldName: string,
  fractionDigits: number,
): void {
  if (decimal.decimalPlaces() > fractionDigits) {
    throw new HttpError(400, `${fieldName} must have at most ${fractionDigits} decimal places`);
  }
}

function minorUnitMultiplier(currencyScale: number): Decimal {
  return new Decimal(10).pow(currencyScale);
}

export function getCurrencyFractionDigits(currency: string): number {
  const currencyScale = CURRENCY_FRACTION_DIGITS[currency];

  if (currencyScale === undefined) {
    throw new HttpError(400, `Unsupported currency: ${currency}`);
  }

  return currencyScale;
}

export function decimalToMinorUnits(decimal: Decimal, currencyScale: number): string {
  return decimal
    .mul(minorUnitMultiplier(currencyScale))
    .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
    .toFixed(0);
}

export function minorUnitsToDecimalString(minorUnits: string, currencyScale: number): string {
  return new Decimal(minorUnits).div(minorUnitMultiplier(currencyScale)).toFixed(currencyScale);
}

export function formatMoney(decimal: Decimal, fractionDigits: number): string {
  return decimal.toDecimalPlaces(fractionDigits).toFixed(fractionDigits);
}

export function calculateInvoiceAmounts({
  amount,
  currency,
  feePercent,
}: {
  amount: string;
  currency: string;
  feePercent: string | number;
}): InvoiceAmounts {
  const amountDecimal = toDecimal(amount, 'amount');
  const feePercentDecimal = toDecimal(feePercent, 'feePercent');
  const currencyScale = getCurrencyFractionDigits(currency);

  if (amountDecimal.lte(0)) {
    throw new HttpError(400, 'amount must be greater than 0');
  }

  if (feePercentDecimal.lt(0) || feePercentDecimal.gt(100)) {
    throw new HttpError(400, 'feePercent must be between 0 and 100');
  }

  ensureDecimalScale(amountDecimal, 'amount', currencyScale);

  const amountMinor = decimalToMinorUnits(amountDecimal, currencyScale);
  const feeMinor = decimalToMinorUnits(amountDecimal.mul(feePercentDecimal).div(100), currencyScale);
  const amountToReceiveMinor = new Decimal(amountMinor).minus(feeMinor).toFixed(0);

  return {
    amount: minorUnitsToDecimalString(amountMinor, currencyScale),
    amountMinor,
    currencyScale,
    feePercent: feePercentDecimal.toString(),
    fee: minorUnitsToDecimalString(feeMinor, currencyScale),
    feeMinor,
    amountToReceive: minorUnitsToDecimalString(amountToReceiveMinor, currencyScale),
    amountToReceiveMinor,
  };
}
