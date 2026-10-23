import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ResourceIdPipe } from '../../common/pipes/resource-id.pipe';
import { CreateMatchDto } from '../dto/create-match.dto';
import { MatchesService } from '../services/matches.service';
import type { Response } from 'express';

@Controller()
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Post('matches')
  @HttpCode(HttpStatus.CREATED)
  async createMatch(
    @Body() dto: CreateMatchDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const match = await this.matchesService.createMatch(dto);
    res.setHeader('Location', `/api/v1/matches/${match.id}`);
    return match;
  }

  @Get('matches')
  async findAllMatches(
    @Query('round') round?: number,
    @Query('club_id') club_id?: number,
  ) {
    return await this.matchesService.findAllMatches({ round, club_id });
  }

  @Get('matches/:id')
  async findOneMatch(@Param('id', ResourceIdPipe) id: number) {
    return await this.matchesService.findOneMatch(id);
  }

  @Get('standings')
  async getStandings() {
    return await this.matchesService.getStandings();
  }
}
