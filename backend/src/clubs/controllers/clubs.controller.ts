import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ResourceIdPipe } from '../../common/pipes/resource-id.pipe';
import { CreateClubDto } from '../dto/create-club.dto';
import { ClubsService } from '../services/clubs.service';
import { SetLineupDto } from '../dto/set-lineup.dto';

@Controller('clubs')
export class ClubsController {
  constructor(private readonly clubsService: ClubsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createClubDto: CreateClubDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const club = await this.clubsService.create(createClubDto);
    res.setHeader('Location', `/api/v1/clubs/${club.id}`);
    return club;
  }

  @Get()
  async findAll(@Query('orderBy') orderBy?: string) {
    return await this.clubsService.findAll(orderBy);
  }

  @Get(':id')
  async findOne(@Param('id', ResourceIdPipe) id: number) {
    return await this.clubsService.findOne(id);
  }

  @Get(':id/transactions')
  async getTransactions(
    @Param('id', ResourceIdPipe) id: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('type') type?: string,
    @Query('player_id') player_id?: string,
  ) {
    return await this.clubsService.getTransactions(id, {
      page,
      limit,
      type,
      player_id,
    });
  }

  @Get(':id/transactions/export')
  async exportTransactions(
    @Param('id', ResourceIdPipe) id: number,
    @Query('type') type: string | undefined,
    @Query('player_id') player_id: string | undefined,
    @Res() res: Response,
  ) {
    const csvData = await this.clubsService.exportTransactionsCsv(id, {
      type,
      player_id,
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=transacoes-clube-${id}.csv`,
    );
    return res.send(csvData);
  }

  @Put(':id/lineup')
  async setLineup(
    @Param('id', ResourceIdPipe) id: number,
    @Body() setLineupDto: SetLineupDto,
  ) {
    return await this.clubsService.setLineup(id, setLineupDto);
  }

  @Get(':id/lineup')
  async getLineup(@Param('id', ResourceIdPipe) id: number) {
    return await this.clubsService.getLineup(id);
  }
}
