import {
  IsEnum,
  IsInt,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class UpdatePlayerDto {
  @IsString()
  @Length(3, 100)
  @Matches(/^[^0-9]*$/)
  @Matches(/^\s*\S+(\s+\S+)+\s*$/)
  name!: string;

  @IsEnum(['GOL', 'ZAG', 'LAT', 'MEI', 'ATA'])
  position!: 'GOL' | 'ZAG' | 'LAT' | 'MEI' | 'ATA';

  @IsInt()
  @Min(1)
  @Max(100)
  agility!: number;

  @IsInt()
  @Min(16)
  @Max(45)
  age!: number;
}
