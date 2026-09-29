import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsString, ValidateIf } from 'class-validator';
import type { MemoType } from '@stellar-payment-request/stellar-domain';

export class CreatePaymentRequestDto {
  @ApiProperty()
  @IsString()
  destination!: string;

  @ApiProperty()
  @IsString()
  assetCode!: string;

  @ApiPropertyOptional()
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  assetIssuer?: string;

  @ApiProperty()
  @IsString()
  amount!: string;

  @ApiPropertyOptional({ enum: ['TEXT', 'ID'] })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsIn(['TEXT', 'ID'])
  memoType?: MemoType;

  @ApiPropertyOptional()
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  memo?: string;
}
