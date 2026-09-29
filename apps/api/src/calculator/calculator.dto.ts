import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CalculateXlmUsdDto {
  @ApiProperty({ example: '10' })
  @IsString()
  @IsNotEmpty()
  amount!: string;
}
