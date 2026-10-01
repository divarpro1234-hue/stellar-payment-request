import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SubmitRegistrationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  requestId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signedXdr!: string;
}
