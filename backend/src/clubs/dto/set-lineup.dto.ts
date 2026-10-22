import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
} from 'class-validator';

const VALID_FORMATIONS = ['4-4-2', '4-3-3', '3-5-2'] as const;

export class SetLineupDto {
  @IsIn(VALID_FORMATIONS, {
    message: `A formação deve ser uma dessas: ${VALID_FORMATIONS.join(', ')}`,
  })
  formation!: string;

  @IsArray({ message: 'player_ids deve ser um Array.' })
  @IsInt({
    each: true,
    message: 'Cada ID de jogador deve ser um número inteiro.',
  })
  @ArrayMinSize(11, {
    message: 'A escalação deve conter exatamente 11 jogadores.',
  })
  @ArrayMaxSize(11, {
    message: 'A escalação deve conter exatamente 11 jogadores.',
  })
  player_ids!: number[];
}
