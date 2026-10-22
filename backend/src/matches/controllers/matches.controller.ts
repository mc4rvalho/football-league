import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { CreateMatchDto } from '../dto/create-match.dto';
import { MatchesService } from '../services/matches.service';

@Controller()
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Post('matches')
  @HttpCode(HttpStatus.CREATED)
  async createMatch(@Body() dto: CreateMatchDto) {
    return await this.matchesService.createMatch(dto);
  }

  @Get('matches')
  async findAllMatches(
    @Query('round') round?: number,
    @Query('club_id') club_id?: number,
  ) {
    return await this.matchesService.findAllMatches({ round, club_id });
  }

  @Get('matches/:id')
  async findOneMatch(@Param('id', ParseIntPipe) id: number) {
    return await this.matchesService.findOneMatch(id);
  }

  @Get('standings')
  async getStandings() {
    return await this.matchesService.getStandings();
  }
}
