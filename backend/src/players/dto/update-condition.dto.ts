// src/players/dto/update-condition.dto.ts
import { IsEnum } from 'class-validator';

export class UpdateConditionDto {
  @IsEnum(['APTO', 'LESIONADO', 'SUSPENSO'], {
    message: 'A condição deve ser APTO, LESIONADO ou SUSPENSO.',
  })
  condition!: 'APTO' | 'LESIONADO' | 'SUSPENSO';
}
