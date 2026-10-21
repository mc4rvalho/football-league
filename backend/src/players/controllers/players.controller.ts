import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { CreatePlayerDto } from '../dto/create-player.dto';
import { UpdatePlayerDto } from '../dto/update-player.dto';
import { UpdateConditionDto } from '../dto/update-condition.dto';
import { PlayersService } from '../services/players.service';
import { BuyPlayerDto } from '../dto/buy-player.dto';

@Controller('players')
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createPlayerDto: CreatePlayerDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const player = await this.playersService.create(createPlayerDto);
    res.setHeader('Location', `/api/v1/players/${player.id}`);
    return player;
  }

  @Post(':id/buy')
  @HttpCode(HttpStatus.OK)
  async buyPlayer(
    @Param('id', ParseIntPipe) id: number,
    @Body() buyPlayerDto: BuyPlayerDto,
  ) {
    return await this.playersService.buyPlayer(id, buyPlayerDto);
  }

  @Post(':id/sell')
  @HttpCode(HttpStatus.OK)
  async sellPlayer(@Param('id', ParseIntPipe) id: number) {
    return await this.playersService.sellPlayer(id);
  }

  @Get()
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('name') name?: string,
    @Query('position') position?: string,
    @Query('club_id') club_id?: number,
    @Query('condition') condition?: string,
  ) {
    return await this.playersService.findAll({
      page,
      limit,
      name,
      position,
      club_id,
      condition,
    });
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.playersService.findOne(id);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePlayerDto: UpdatePlayerDto,
  ) {
    return await this.playersService.update(id, updatePlayerDto);
  }

  @Patch(':id/condition')
  async updateCondition(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateConditionDto: UpdateConditionDto,
  ) {
    return await this.playersService.updateCondition(id, updateConditionDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number) {
    return await this.playersService.remove(id);
  }
}
