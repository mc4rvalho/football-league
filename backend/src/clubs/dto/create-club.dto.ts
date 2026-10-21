import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class CreateClubDto {
  @IsString()
  @IsNotEmpty({ message: 'O nome do clube é obrigatório.' })
  @Length(3, 60, { message: 'Onome deve ter entre 3 e 60 caracteres.' })
  name!: string;

  @IsString()
  @Length(3, 3, { message: 'A sigla deve conter exatamente 3 caracteres.' })
  @Matches(/^[A-Za-z]+$/, { message: 'A sigla deve conter apenas letras.' })
  sigla!: string;
}
