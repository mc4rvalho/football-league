import { IsInt, Min } from 'class-validator';

export class BuyPlayerDto {
  @IsInt()
  @Min(1)
  buyer_club_id!: number;
}
