import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, ValidateIf } from 'class-validator';

export class CheckTrustlineDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  account!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  assetCode!: string;

  @ApiPropertyOptional()
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  assetIssuer?: string;
}
