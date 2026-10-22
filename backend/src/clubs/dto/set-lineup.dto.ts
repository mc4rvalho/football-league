import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
} from 'class-validator';

const VALID_FORMATIONS = ['3-1', '2-2', '2-1-1', '1-2-1'] as const;

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
  @ArrayMinSize(5, {
    message: 'A escalação deve conter exatamente 5 jogadores.',
  })
  @ArrayMaxSize(5, {
    message: 'A escalação deve conter exatamente 5 jogadores.',
  })
  player_ids!: number[];
}
