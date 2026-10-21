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
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { CreateClubDto } from '../dto/create-club.dto';
import { ClubsService } from '../services/clubs.service';

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
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.clubsService.findOne(id);
  }

  @Get(':id/transactions')
  async getTransactions(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('type') type?: string,
  ) {
    return await this.clubsService.getTransactions(id, { page, limit, type });
  }

  @Get(':id/transactions/export')
  async exportTransactions(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const csvData = await this.clubsService.exportTransactionsCsv(id);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=transacoes-clube-${id}.csv`,
    );
    return res.send(csvData);
  }
}
