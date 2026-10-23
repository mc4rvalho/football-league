import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Jogador } from '../../generated/prisma/client';
import { CreatePlayerDto } from '../dto/create-player.dto';
import { UpdatePlayerDto } from '../dto/update-player.dto';
import { UpdateConditionDto } from '../dto/update-condition.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { BuyPlayerDto } from '../dto/buy-player.dto';
import { calculateMarketValue } from '../domain/market-value';

type PositionType = 'GOL' | 'ZAG' | 'LAT' | 'MEI' | 'ATA';

@Injectable()
export class PlayersService {
  constructor(private readonly prisma: PrismaService) {}

  private calculateOverall(
    position: PositionType,
    stats: {
      pace: number;
      shooting: number;
      passing: number;
      dribbling: number;
      defending: number;
      physical: number;
    },
  ): number {
    const weights: Record<
      PositionType,
      {
        pace: number;
        shooting: number;
        passing: number;
        dribbling: number;
        defending: number;
        physical: number;
      }
    > = {
      GOL: {
        pace: 0.1,
        shooting: 0,
        passing: 0.2,
        dribbling: 0,
        defending: 0.4,
        physical: 0.3,
      },
      ZAG: {
        pace: 0.1,
        shooting: 0,
        passing: 0.15,
        dribbling: 0,
        defending: 0.45,
        physical: 0.3,
      },
      LAT: {
        pace: 0.25,
        shooting: 0,
        passing: 0.2,
        dribbling: 0.15,
        defending: 0.25,
        physical: 0.15,
      },
      MEI: {
        pace: 0.1,
        shooting: 0.15,
        passing: 0.35,
        dribbling: 0.25,
        defending: 0.05,
        physical: 0.1,
      },
      ATA: {
        pace: 0.2,
        shooting: 0.4,
        passing: 0.1,
        dribbling: 0.2,
        defending: 0,
        physical: 0.1,
      },
    };

    const w = weights[position];
    const weightedSum =
      stats.pace * w.pace +
      stats.shooting * w.shooting +
      stats.passing * w.passing +
      stats.dribbling * w.dribbling +
      stats.defending * w.defending +
      stats.physical * w.physical;

    return Math.round(weightedSum);
  }

  private calculateBaseValue(
    overall: number,
    potential: number,
    age: number,
  ): number {
    let overallPart = 0;

    if (overall > 40) {
      const pointsRange1 = Math.min(overall, 60) - 40;
      overallPart += pointsRange1 * 0.5;

      if (overall > 60) {
        const pointsRange2 = Math.min(overall, 75) - 60;
        overallPart += pointsRange2 * 2.0;

        if (overall > 75) {
          const pointsRange3 = overall - 75;
          overallPart += pointsRange3 * 6.0;
        }
      }
    }

    let calculatedValue = overallPart;

    if (age <= 21) {
      const multiplier = (100 + potential - overall) / 100;
      calculatedValue = overallPart * multiplier;
    }

    const roundedValue = Math.round(calculatedValue * 100) / 100;
    return Math.max(1.0, roundedValue);
  }

  private calculateMarketValue(
    baseValue: number,
    condition: string,
    agility: number,
    age: number,
  ): number {
    return calculateMarketValue(
      baseValue,
      condition as 'APTO' | 'MAL_CONDICIONADO' | 'DOENTE',
      agility,
      age,
    );
  }

  private mapToResponse(player: Jogador) {
    const baseValueNumber = Number(player.valor_base);
    const position = player.posicao as PositionType;

    const overall = this.calculateOverall(position, {
      pace: player.velocidade,
      shooting: player.finalizacao,
      passing: player.passe,
      dribbling: player.drible,
      defending: player.defesa,
      physical: player.fisico,
    });

    const marketValue = this.calculateMarketValue(
      baseValueNumber,
      player.condicao,
      player.agilidade,
      player.idade,
    );

    return {
      id: player.id,
      name: player.nome,
      position: player.posicao,
      agility: player.agilidade,
      age: player.idade,
      condition: player.condicao,
      base_value: baseValueNumber,
      market_value: marketValue,
      pace: player.velocidade,
      shooting: player.finalizacao,
      passing: player.passe,
      dribbling: player.drible,
      defending: player.defesa,
      physical: player.fisico,
      potential: player.potencial,
      overall,
      club_id: player.clube_id,
    };
  }

  async buyPlayer(playerId: number, dto: BuyPlayerDto) {
    const player = await this.prisma.jogador.findFirst({
      where: { id: playerId, excluido_em: null },
    });
    if (!player) throw new NotFoundException('Jogador não encontrado.');
    if (player.clube_id !== null)
      throw new ConflictException('O jogador não está livre.');
    const club = await this.prisma.clube.findUnique({
      where: { id: dto.club_id },
    });
    if (!club) throw new NotFoundException('Clube comprador não encontrado.');
    const now = new Date();
    const loyaltyUntil = new Date(dto.loyalty_until);
    if (
      !Number.isFinite(loyaltyUntil.getTime()) ||
      loyaltyUntil <= now ||
      loyaltyUntil.getTime() > now.getTime() + 1095 * 86400000
    ) {
      throw new BadRequestException(
        'Fim de fidelidade deve estar no futuro e em até 1.095 dias.',
      );
    }
    const lastSale = await this.prisma.transacao.findFirst({
      where: { jogador_id: playerId, tipo: 'VENDA' },
      orderBy: [{ criado_em: 'desc' }, { id: 'desc' }],
    });
    if (lastSale?.clube_id === dto.club_id)
      throw new ConflictException(
        'O clube que vendeu o jogador não pode comprá-lo novamente.',
      );
    if (
      (await this.prisma.jogador.count({
        where: { clube_id: dto.club_id, excluido_em: null },
      })) >= 12
    )
      throw new ConflictException(
        'O elenco já atingiu o limite de 12 jogadores.',
      );
    const value = this.calculateMarketValue(
      Number(player.valor_base),
      player.condicao,
      player.agilidade,
      player.idade,
    );
    const fee =
      value > 30 ? Math.round((value * 0.05 + Number.EPSILON) * 100) / 100 : 0;
    const total = value + fee;
    if (total > Number(club.caixa) * 0.5)
      throw new ConflictException(
        'O custo da compra ultrapassa 50% do caixa do clube.',
      );
    const cash = Number((Number(club.caixa) - total).toFixed(2));
    const transaction = await this.prisma.$transaction(async (tx) => {
      await tx.clube.update({
        where: { id: dto.club_id },
        data: { caixa: { decrement: total } },
      });
      await tx.jogador.update({
        where: { id: playerId },
        data: { clube_id: dto.club_id },
      });
      const contract = await tx.contrato.create({
        data: {
          jogador_id: playerId,
          clube_id: dto.club_id,
          valor_compra: value,
          fidelidade_ate: loyaltyUntil,
          situacao: 'ATIVO',
        },
      });
      const record = await tx.transacao.create({
        data: {
          clube_id: dto.club_id,
          jogador_id: playerId,
          nome_jogador: player.nome,
          tipo: 'COMPRA',
          valor: value,
          taxa: fee,
          multa: 0,
          variacao_caixa: -total,
        },
      });
      return { contract, record };
    });
    return {
      id: transaction.record.id,
      club_id: dto.club_id,
      player_id: playerId,
      player_name: player.nome,
      type: 'COMPRA',
      value,
      fee,
      penalty: 0,
      profit: null,
      cash_change: -total,
      created_at: transaction.record.criado_em,
      contract: {
        purchase_value: value,
        loyalty_until: loyaltyUntil.toISOString(),
        status: transaction.contract.situacao,
      },
      club_cash: cash,
    };
  }

  async sellPlayer(playerId: number) {
    const player = await this.prisma.jogador.findFirst({
      where: { id: playerId, excluido_em: null },
    });
    if (!player) throw new NotFoundException('Jogador não encontrado.');
    if (player.clube_id === null)
      throw new ConflictException('Jogador livre não pode ser vendido.');
    const clubId = player.clube_id;
    const contract = await this.prisma.contrato.findFirst({
      where: { jogador_id: playerId, clube_id: clubId, situacao: 'ATIVO' },
      orderBy: { iniciado_em: 'desc' },
    });
    if (!contract)
      throw new ConflictException('Contrato ativo do jogador não encontrado.');
    const now = new Date();
    const days = Math.max(
      0,
      Math.ceil((contract.fidelidade_ate.getTime() - now.getTime()) / 86400000),
    );
    const rate = days === 0 ? 0 : days <= 30 ? 5 : days <= 180 ? 10 : 20;
    const value = this.calculateMarketValue(
      Number(player.valor_base),
      player.condicao,
      player.agilidade,
      player.idade,
    );
    const penalty = Math.min(
      10,
      Math.round(((value * rate) / 100 + Number.EPSILON) * 100) / 100,
    );
    const profit = Number((value - Number(contract.valor_compra)).toFixed(2));
    const fee =
      profit > 0
        ? Math.round(
            (Math.min(profit, 10) * 0.1 +
              Math.max(0, profit - 10) * 0.2 +
              Number.EPSILON) *
              100,
          ) / 100
        : 0;
    const credit = Number((value - penalty - fee).toFixed(2));
    const club = await this.prisma.clube.findUniqueOrThrow({
      where: { id: clubId },
    });
    const cash = Number((Number(club.caixa) + credit).toFixed(2));
    const record = await this.prisma.$transaction(async (tx) => {
      await tx.clube.update({
        where: { id: clubId },
        data: { caixa: { increment: credit } },
      });
      await tx.jogador.update({
        where: { id: playerId },
        data: { clube_id: null },
      });
      await tx.escalacao.deleteMany({ where: { jogador_id: playerId } });
      await tx.contrato.update({
        where: { id: contract.id },
        data: {
          situacao: penalty > 0 ? 'RESCINDIDO' : 'ENCERRADO',
          encerrado_em: now,
        },
      });
      return tx.transacao.create({
        data: {
          clube_id: clubId,
          jogador_id: playerId,
          nome_jogador: player.nome,
          tipo: 'VENDA',
          valor: value,
          taxa: fee,
          multa: penalty,
          lucro: profit,
          variacao_caixa: credit,
        },
      });
    });
    return {
      id: record.id,
      club_id: clubId,
      player_id: playerId,
      player_name: player.nome,
      type: 'VENDA',
      value,
      fee,
      penalty,
      profit,
      cash_change: credit,
      created_at: record.criado_em,
      purchase_value: Number(contract.valor_compra),
      remaining_days: days,
      penalty_rate: rate,
      contract_status: penalty > 0 ? 'RESCINDIDO' : 'ENCERRADO',
      club_cash: cash,
    };
  }

  async create(createPlayerDto: CreatePlayerDto) {
    const {
      name,
      position,
      agility,
      age,
      pace,
      shooting,
      passing,
      dribbling,
      defending,
      physical,
      potential,
    } = createPlayerDto;

    const attributesSum =
      pace + shooting + passing + dribbling + defending + physical;
    if (attributesSum > 480) {
      throw new BadRequestException(
        'A soma dos 6 atributos principais não pode ultrapassar 480.',
      );
    }

    const maxAttr = Math.max(
      pace,
      shooting,
      passing,
      dribbling,
      defending,
      physical,
    );

    if (potential < maxAttr) {
      throw new BadRequestException(
        'O potencial não pode ser menor que o maior atributo do jogador.',
      );
    }

    if (age >= 33 && potential !== maxAttr) {
      throw new BadRequestException(
        'Para jogadores com 33 anos ou mais, o potencial deve ser estritamente igual ao seu maior atributo.',
      );
    }

    if (age >= 35 && agility > 85) {
      throw new BadRequestException(
        'Para jogadores com 35 anos ou mais, a agilidade não pode ultrapassar 85.',
      );
    }

    const overall = this.calculateOverall(position, {
      pace,
      shooting,
      passing,
      dribbling,
      defending,
      physical,
    });

    const baseValue = this.calculateBaseValue(overall, potential, age);

    const createdPlayer = await this.prisma.jogador.create({
      data: {
        nome: name,
        posicao: position,
        agilidade: agility,
        idade: age,
        velocidade: pace,
        finalizacao: shooting,
        passe: passing,
        drible: dribbling,
        defesa: defending,
        fisico: physical,
        potencial: potential,
        valor_base: baseValue,
        condicao: 'APTO',
      },
    });

    return this.mapToResponse(createdPlayer);
  }

  async findAll(query: Record<string, string>) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    if (query.free === 'true' && query.club_id)
      throw new BadRequestException('free não pode ser combinado com club_id.');
    const rows = await this.prisma.jogador.findMany({
      where: { excluido_em: null },
    });
    let players = rows.map((player) => this.mapToResponse(player));
    const search = query.search?.trim();
    if (search && search.length < 2)
      throw new BadRequestException('search deve ter pelo menos 2 caracteres.');
    if (search)
      players = players.filter((p) =>
        p.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
      );
    if (query.position)
      players = players.filter((p) => p.position === query.position);
    if (query.condition)
      players = players.filter((p) => p.condition === query.condition);
    if (query.free === 'true')
      players = players.filter((p) => p.club_id === null);
    if (query.in_club === 'true')
      players = players.filter((p) => p.club_id !== null);
    if (query.club_id)
      players = players.filter((p) => p.club_id === Number(query.club_id));
    if (query.min_age)
      players = players.filter((p) => p.age >= Number(query.min_age));
    if (query.max_age)
      players = players.filter((p) => p.age <= Number(query.max_age));
    if (query.min_value)
      players = players.filter(
        (p) => p.market_value >= Number(query.min_value),
      );
    if (query.max_value)
      players = players.filter(
        (p) => p.market_value <= Number(query.max_value),
      );
    const sorters: Record<
      string,
      (a: (typeof players)[number], b: (typeof players)[number]) => number
    > = {
      name: (a, b) => a.name.localeCompare(b.name, 'pt-BR'),
      value_asc: (a, b) => a.market_value - b.market_value,
      value_desc: (a, b) => b.market_value - a.market_value,
      age_asc: (a, b) => a.age - b.age,
      age_desc: (a, b) => b.age - a.age,
      position: (a, b) => a.position.localeCompare(b.position),
    };
    if (query.sort && !sorters[query.sort])
      throw new BadRequestException('sort inválido.');
    players.sort(sorters[query.sort || 'name']);
    const total = players.length;
    return {
      data: players.slice((page - 1) * limit, page * limit),
      meta: {
        page,
        limit,
        total_items: total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const player = await this.prisma.jogador.findFirst({
      where: { id, excluido_em: null },
    });

    if (!player) {
      throw new NotFoundException(`Jogador com ID ${id} não encontrado.`);
    }

    return this.mapToResponse(player);
  }

  async update(id: number, updatePlayerDto: UpdatePlayerDto) {
    const existingPlayer = await this.prisma.jogador.findFirst({
      where: { id, excluido_em: null },
    });

    if (!existingPlayer) {
      throw new NotFoundException(`Jogador com ID ${id} não encontrado.`);
    }

    if (updatePlayerDto.age < existingPlayer.idade)
      throw new ConflictException('A idade não pode diminuir.');
    if (
      existingPlayer.clube_id !== null &&
      updatePlayerDto.position !== existingPlayer.posicao
    )
      throw new ConflictException(
        'A posição não pode mudar enquanto o jogador pertence a um clube.',
      );
    if (updatePlayerDto.age >= 35 && updatePlayerDto.agility > 85)
      throw new BadRequestException(
        'Jogador com 35 anos ou mais pode ter agilidade máxima 85.',
      );
    const updatedPlayer = await this.prisma.jogador.update({
      where: { id },
      data: {
        nome: updatePlayerDto.name,
        posicao: updatePlayerDto.position,
        agilidade: updatePlayerDto.agility,
        idade: updatePlayerDto.age,
      },
    });
    return this.mapToResponse(updatedPlayer);
  }

  async updateCondition(id: number, updateConditionDto: UpdateConditionDto) {
    const player = await this.prisma.jogador.findFirst({
      where: { id, excluido_em: null },
    });

    if (!player) {
      throw new NotFoundException(`Jogador com ID ${id} não encontrado.`);
    }

    if (player.condicao === 'DOENTE' && updateConditionDto.condition === 'APTO')
      throw new ConflictException(
        'De DOENTE, o jogador deve passar por MAL_CONDICIONADO antes de APTO.',
      );
    const updatedPlayer = await this.prisma.jogador.update({
      where: { id },
      data: { condicao: updateConditionDto.condition },
    });

    return this.mapToResponse(updatedPlayer);
  }

  async remove(id: number) {
    const player = await this.prisma.jogador.findFirst({
      where: { id, excluido_em: null },
    });

    if (!player) {
      throw new NotFoundException(`Jogador com ID ${id} não encontrado.`);
    }

    if (player.clube_id !== null) {
      throw new BadRequestException(
        'Apenas jogadores livres (sem clube vinculado) podem ser excluídos.',
      );
    }

    await this.prisma.jogador.update({
      where: { id },
      data: {
        excluido_em: new Date(),
      },
    });
  }
}
