import { z } from 'zod';

const stellarAccount = /^G[A-Z2-7]{55}$/;
const amountPattern = /^(?=.*[1-9])\d+(?:\.\d{1,7})?$/;

export const paymentRequestSchema = z
  .object({
    destination: z
      .string()
      .trim()
      .regex(stellarAccount, 'Introduce una cuenta Stellar G... válida.'),
    assetCode: z
      .string()
      .trim()
      .min(1, 'Indica el código del activo.')
      .max(12, 'El código no puede superar 12 caracteres.'),
    assetIssuer: z.string().trim().optional(),
    amount: z
      .string()
      .trim()
      .regex(amountPattern, 'Usa un importe positivo con hasta 7 decimales.'),
    memoType: z.enum(['NONE', 'TEXT', 'ID']),
    memo: z.string().optional(),
  })
  .superRefine((value, context) => {
    if (value.assetCode.toUpperCase() !== 'XLM') {
      if (!value.assetIssuer?.trim()) {
        context.addIssue({
          code: 'custom',
          path: ['assetIssuer'],
          message: 'El emisor es obligatorio para activos emitidos.',
        });
      } else if (!stellarAccount.test(value.assetIssuer.trim())) {
        context.addIssue({
          code: 'custom',
          path: ['assetIssuer'],
          message: 'Introduce una cuenta emisora Stellar G... válida.',
        });
      }
    }
    if (value.memoType !== 'NONE' && !value.memo?.trim()) {
      context.addIssue({
        code: 'custom',
        path: ['memo'],
        message: 'Escribe el memo seleccionado.',
      });
    }
    if (
      value.memoType === 'TEXT' &&
      value.memo &&
      new TextEncoder().encode(value.memo).length > 28
    ) {
      context.addIssue({
        code: 'custom',
        path: ['memo'],
        message: 'El memo de texto no puede superar 28 bytes UTF-8.',
      });
    }
    if (
      value.memoType === 'ID' &&
      value.memo &&
      !/^\d{1,20}$/.test(value.memo.trim())
    ) {
      context.addIssue({
        code: 'custom',
        path: ['memo'],
        message: 'El memo ID debe ser un entero sin signo de 64 bits.',
      });
    }
    if (
      value.memoType === 'ID' &&
      value.memo &&
      /^\d+$/.test(value.memo.trim()) &&
      BigInt(value.memo.trim()) > 18446744073709551615n
    ) {
      context.addIssue({
        code: 'custom',
        path: ['memo'],
        message: 'El memo ID supera el máximo de 64 bits.',
      });
    }
  });

export type PaymentRequestInput = z.infer<typeof paymentRequestSchema>;

export const calculatorSchema = z.object({
  amount: z
    .string()
    .trim()
    .regex(amountPattern, 'Usa un importe positivo con hasta 7 decimales.'),
});

export const trustlineSchema = z
  .object({
    account: z
      .string()
      .trim()
      .regex(stellarAccount, 'Introduce una cuenta Stellar G... válida.'),
    assetCode: z
      .string()
      .trim()
      .min(1, 'Indica el código del activo.')
      .max(12, 'El código no puede superar 12 caracteres.'),
    assetIssuer: z.string().trim().optional(),
  })
  .superRefine((value, context) => {
    if (value.assetCode.toUpperCase() !== 'XLM' && !value.assetIssuer?.trim()) {
      context.addIssue({
        code: 'custom',
        path: ['assetIssuer'],
        message: 'El emisor es obligatorio para activos emitidos.',
      });
    } else if (
      value.assetCode.toUpperCase() !== 'XLM' &&
      !stellarAccount.test(value.assetIssuer?.trim() ?? '')
    ) {
      context.addIssue({
        code: 'custom',
        path: ['assetIssuer'],
        message: 'Introduce una cuenta emisora Stellar G... válida.',
      });
    }
  });
