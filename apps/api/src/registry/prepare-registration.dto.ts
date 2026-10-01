import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class PrepareRegistrationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  requestId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  registrant!: string;
}
