import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Jogador, Prisma } from '../../generated/prisma/client';
import { CreatePlayerDto } from '../dto/create-player.dto';
import { UpdatePlayerDto } from '../dto/update-player.dto';
import { UpdateConditionDto } from '../dto/update-condition.dto';
import { PrismaService } from '../../prisma/prisma.service';

type PositionType = 'GOL' | 'ZAG' | 'LAT' | 'MEI' | 'ATA';

@Injectable()
export class PlayersService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // MÉTODOS PRIVADOS DE CÁLCULO (RN06)
  // ---------------------------------------------------------------------------

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

  private calculateMarketValue(baseValue: number, condition: string): number {
    let factor = 1.0;

    if (condition === 'LESIONADO') {
      factor = 0.75;
    } else if (condition === 'SUSPENSO') {
      factor = 0.9;
    }

    const marketValue = Math.round(baseValue * factor * 100) / 100;
    return Math.max(1.0, marketValue);
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

  // ---------------------------------------------------------------------------
  // OPERAÇÕES DO RECURSO (CRUD)
  // ---------------------------------------------------------------------------

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

  async findAll(query: {
    page?: number;
    limit?: number;
    name?: string;
    position?: string;
    club_id?: number;
    condition?: string;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.JogadorWhereInput = {
      excluido_em: null,
    };

    if (query.name) {
      where.nome = { contains: query.name, mode: 'insensitive' };
    }

    if (query.position) {
      where.posicao = query.position;
    }

    if (query.club_id !== undefined) {
      where.clube_id =
        Number(query.club_id) === 0 ? null : Number(query.club_id);
    }

    if (query.condition) {
      where.condicao = query.condition;
    }

    const [total, players] = await Promise.all([
      this.prisma.jogador.count({ where }),
      this.prisma.jogador.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'asc' },
      }),
    ]);

    return {
      data: players.map((player) => this.mapToResponse(player)),
      meta: {
        total,
        page,
        limit,
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

    const name = updatePlayerDto.name ?? existingPlayer.nome;
    const position = (updatePlayerDto.position ??
      existingPlayer.posicao) as PositionType;
    const agility = updatePlayerDto.agility ?? existingPlayer.agilidade;
    const age = updatePlayerDto.age ?? existingPlayer.idade;
    const pace = updatePlayerDto.pace ?? existingPlayer.velocidade;
    const shooting = updatePlayerDto.shooting ?? existingPlayer.finalizacao;
    const passing = updatePlayerDto.passing ?? existingPlayer.passe;
    const dribbling = updatePlayerDto.dribbling ?? existingPlayer.drible;
    const defending = updatePlayerDto.defending ?? existingPlayer.defesa;
    const physical = updatePlayerDto.physical ?? existingPlayer.fisico;
    const potential = updatePlayerDto.potential ?? existingPlayer.potencial;

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

    const updatedPlayer = await this.prisma.jogador.update({
      where: { id },
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

    const updatedPlayer = await this.prisma.jogador.update({
      where: { id },
      data: {
        condicao: updateConditionDto.condition,
      },
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
