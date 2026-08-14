import { IsUrl, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUrlDto {
  @ApiProperty({
    description: 'The original URL to shorten',
    example: 'https://www.google.com',
  })
  @IsNotEmpty()
  @IsUrl()
  longUrl!: string;
}
