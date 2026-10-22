import { IsEnum } from 'class-validator';

export class UpdateConditionDto {
  @IsEnum(['APTO', 'MAL_CONDICIONADO', 'DOENTE'], {
    message: 'A condição deve ser APTO, MAL_CONDICIONADO ou DOENTE.',
  })
  condition!: 'APTO' | 'MAL_CONDICIONADO' | 'DOENTE';
}
