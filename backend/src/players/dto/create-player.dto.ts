import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class CreatePlayerDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 100)
  @Matches(/^[^0-9]*$/, { message: 'O nome não pode conter dígitos.' })
  @Matches(/^\s*\S+(\s+\S+)+\s*$/, {
    message: 'O nome deve conter pelo menos duas palavras.',
  })
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

  @IsInt()
  @Min(1)
  @Max(99)
  pace!: number;

  @IsInt()
  @Min(1)
  @Max(99)
  shooting!: number;

  @IsInt()
  @Min(1)
  @Max(99)
  passing!: number;

  @IsInt()
  @Min(1)
  @Max(99)
  dribbling!: number;

  @IsInt()
  @Min(1)
  @Max(99)
  defending!: number;

  @IsInt()
  @Min(1)
  @Max(99)
  physical!: number;

  @IsInt()
  @Min(1)
  @Max(99)
  potential!: number;
}
