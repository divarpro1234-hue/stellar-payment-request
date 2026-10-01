import { describe, expect, it } from 'vitest';
import {
  calculatorSchema,
  paymentRequestSchema,
  trustlineSchema,
} from './validation';

const destination = 'GDWUSKGGFDI4FRXK5EBTRECZSVQSSWJHHJOGH6JWG3AUMFFMQ435DIAG';
const issuer = 'GDFJHLAXAUMHA4OWPOB4P7YO72AQR2HMIUYFOXLXE2DZGM633K7HZDQP';

describe('payment request validation', () => {
  it('accepts a native XLM request without issuer or memo', () => {
    const result = paymentRequestSchema.safeParse({
      destination,
      assetCode: 'XLM',
      amount: '2.5000000',
      memoType: 'NONE',
      memo: '',
    });
    expect(result.success).toBe(true);
  });

  it('requires a valid issuer for issued assets', () => {
    const result = paymentRequestSchema.safeParse({
      destination,
      assetCode: 'USDC',
      amount: '2',
      memoType: 'NONE',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((issue) => issue.path[0] === 'assetIssuer'),
      ).toBe(true);
    }
  });

  it('enforces the UTF-8 memo length and amount precision', () => {
    const overlongMemo = paymentRequestSchema.safeParse({
      destination,
      assetCode: 'USDC',
      assetIssuer: issuer,
      amount: '1.00000000',
      memoType: 'TEXT',
      memo: 'á'.repeat(15),
    });
    expect(overlongMemo.success).toBe(false);
  });

  it('rejects an ID memo above unsigned 64-bit range', () => {
    const result = paymentRequestSchema.safeParse({
      destination,
      assetCode: 'XLM',
      amount: '1',
      memoType: 'ID',
      memo: '18446744073709551616',
    });
    expect(result.success).toBe(false);
  });
});

describe('tool validation', () => {
  it('accepts only positive amounts with at most seven decimals', () => {
    expect(calculatorSchema.safeParse({ amount: '12.1234567' }).success).toBe(
      true,
    );
    expect(calculatorSchema.safeParse({ amount: '0' }).success).toBe(false);
    expect(calculatorSchema.safeParse({ amount: '1.12345678' }).success).toBe(
      false,
    );
  });

  it('accepts XLM trustline input without an issuer', () => {
    expect(
      trustlineSchema.safeParse({ account: destination, assetCode: 'XLM' })
        .success,
    ).toBe(true);
  });
});
