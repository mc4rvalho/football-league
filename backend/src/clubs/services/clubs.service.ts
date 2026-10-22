import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateClubDto } from '../dto/create-club.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import { SetLineupDto } from '../dto/set-lineup.dto';
type PositionType = 'GOL' | 'ZAG' | 'LAT' | 'MEI' | 'ATA';

@Injectable()
export class ClubsService {
  constructor(private readonly prisma: PrismaService) {}

  private calculateMarketValue(
    baseValue: number,
    condition: string,
    agility: number,
    age: number,
  ): number {
    let discount =
      condition === 'MAL_CONDICIONADO' ? 15 : condition === 'DOENTE' ? 30 : 0;
    if (condition !== 'APTO') {
      if (agility >= 80) discount /= 2;
      else if (agility <= 30) discount += 10;
    }
    const ageAdjustment = age <= 21 ? 10 : age >= 32 ? -10 : 0;
    const percentage = Math.max(-40, ageAdjustment - discount);
    return Math.max(
      1,
      Math.round(
        ((baseValue * (100 + percentage)) / 100 + Number.EPSILON) * 100,
      ) / 100,
    );
  }

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

  async getTransactions(
    clubId: number,
    query: { page?: number; limit?: number; type?: string },
  ) {
    const club = await this.prisma.clube.findUnique({
      where: { id: clubId },
    });

    if (!club) {
      throw new NotFoundException(`Clube com ID ${clubId} não encontrado.`);
    }

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const whereCondition: Prisma.TransacaoWhereInput = { clube_id: clubId };
    if (query.type) {
      whereCondition.tipo = query.type.toUpperCase();
    }

    const [total, transactions, allClubTransactions] = await Promise.all([
      this.prisma.transacao.count({ where: whereCondition }),
      this.prisma.transacao.findMany({
        where: whereCondition,
        skip,
        take: limit,
        orderBy: { criado_em: 'desc' },
      }),
      this.prisma.transacao.findMany({
        where: { clube_id: clubId },
      }),
    ]);

    let total_entrances = 0;
    let total_exits = 0;

    allClubTransactions.forEach((t) => {
      const val = Number(t.variacao_caixa);
      if (val > 0) {
        total_entrances += val;
      } else {
        total_exits += Math.abs(val);
      }
    });

    const net_result = total_entrances - total_exits;

    const data = transactions.map((t) => ({
      id: t.id,
      club_id: t.clube_id,
      player_ids: t.jogador_id,
      player_name: t.nome_jogador,
      type: t.tipo,
      amount: Number(t.valor),
      cash_change: Number(t.variacao_caixa),
      created_at: t.criado_em,
    }));

    return {
      data,
      summary: {
        total_entrances: Number(total_entrances.toFixed(2)),
        total_exits: Number(total_exits.toFixed(2)),
        net_result: Number(net_result.toFixed(2)),
      },
      meta: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async exportTransactionsCsv(clubId: number): Promise<string> {
    const club = await this.prisma.clube.findUnique({
      where: { id: clubId },
    });

    if (!club) {
      throw new NotFoundException(`Clube com ID ${clubId} não encontrado.`);
    }

    const transactions = await this.prisma.transacao.findMany({
      where: { clube_id: clubId },
      orderBy: { criado_em: 'desc' },
    });

    const header = 'ID,Data,Tipo,Jogador,Valor,VariacaoCaixa\n';
    const rows = transactions
      .map((t) =>
        [
          t.id,
          t.criado_em.toISOString(),
          t.tipo,
          `"${t.nome_jogador}"`,
          Number(t.valor),
          Number(t.variacao_caixa),
        ].join(','),
      )
      .join('\n');

    return header + rows;
  }

  async setLineup(clubId: number, lineup: SetLineupDto) {
    const club = await this.prisma.clube.findUnique({ where: { id: clubId } });
    if (!club) {
      throw new NotFoundException(`Clube com ID ${clubId} não encontrado.`);
    }

    const uniqueIds = new Set(lineup.player_ids);
    if (uniqueIds.size !== 5) {
      throw new BadRequestException(
        'A escalação deve conter 5 jogadores distintos.',
      );
    }

    const players = await this.prisma.jogador.findMany({
      where: {
        id: { in: lineup.player_ids },
        clube_id: clubId,
        excluido_em: null,
      },
    });

    if (players.length !== 5) {
      throw new BadRequestException(
        'Todos os titulares devem pertencer ao clube.',
      );
    }

    const unavailable = players.find((p) => p.condicao === 'DOENTE');
    if (unavailable) {
      throw new BadRequestException(
        `O jogador ${unavailable.nome} está indisponível para o jogo (Condição: ${unavailable.condicao}).`,
      );
    }

    const golCount = players.filter((p) => p.posicao === 'GOL').length;
    if (golCount !== 1) {
      throw new BadRequestException(
        'A escalação deve conter exatamente 1 goleiro (GOL).',
      );
    }

    const formations: Record<string, string[]> = {
      '3-1': ['ZAG', 'LAT', 'LAT', 'ATA'],
      '2-2': ['ZAG', 'LAT', 'ATA', 'ATA'],
      '2-1-1': ['ZAG', 'LAT', 'MEI', 'ATA'],
      '1-2-1': ['ZAG', 'MEI', 'MEI', 'ATA'],
    };
    const expected = formations[lineup.formation];
    const actual = players
      .filter((p) => p.posicao !== 'GOL')
      .map((p) => p.posicao)
      .sort();

    if (actual.join(',') !== [...expected].sort().join(',')) {
      throw new BadRequestException(
        `As posições não correspondem à formação ${lineup.formation}.`,
      );
    }

    await this.prisma.$transaction([
      this.prisma.escalacao.deleteMany({ where: { clube_id: clubId } }),
      this.prisma.clube.update({
        where: { id: clubId },
        data: { formacao: lineup.formation },
      }),
      ...lineup.player_ids.map((jogador_id) =>
        this.prisma.escalacao.create({
          data: { clube_id: clubId, jogador_id },
        }),
      ),
    ]);

    return {
      message: 'Escalação e formação salvas com sucesso!',
      formation: lineup.formation,
      starting_eleven: players.map((p) => ({
        id: p.id,
        name: p.nome,
        position: p.posicao,
      })),
    };
  }

  async getLineup(clubId: number) {
    const club = await this.prisma.clube.findUnique({ where: { id: clubId } });
    if (!club) {
      throw new NotFoundException(`Clube com ID ${clubId} não encontrado.`);
    }

    const starters = await this.prisma.jogador.findMany({
      where: {
        clube_id: clubId,
        excluido_em: null,
        escalacaos: { is: { clube_id: clubId } },
      },
      orderBy: { id: 'asc' },
    });

    return {
      club_id: club.id,
      club_name: club.nome,
      formation: club.formacao,
      complete: starters.length === 5,
      players: starters.map((p) => {
        const baseValue = Number(p.valor_base);
        const position = p.posicao as PositionType;

        return {
          id: p.id,
          name: p.nome,
          position: p.posicao,
          agility: p.agilidade,
          age: p.idade,
          condition: p.condicao,
          base_value: baseValue,
          market_value: this.calculateMarketValue(
            baseValue,
            p.condicao,
            p.agilidade,
            p.idade,
          ),
          pace: p.velocidade,
          shooting: p.finalizacao,
          passing: p.passe,
          dribbling: p.drible,
          defending: p.defesa,
          physical: p.fisico,
          potential: p.potencial,
          overall: this.calculateOverall(position, {
            pace: p.velocidade,
            shooting: p.finalizacao,
            passing: p.passe,
            dribbling: p.drible,
            defending: p.defesa,
            physical: p.fisico,
          }),
          club_id: p.clube_id,
        };
      }),
    };
  }

  async create(createClubDto: CreateClubDto) {
    const totalClubs = await this.prisma.clube.count();
    if (totalClubs >= 20) {
      throw new BadRequestException(
        'O limite máximo de 20 clubes no campeonato já foi atingido.',
      );
    }

    const nomeNormalizado = createClubDto.name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
    const siglaFormatada = createClubDto.sigla.trim().toUpperCase();

    const clubeExistente = await this.prisma.clube.findFirst({
      where: {
        OR: [{ nome_normalizado: nomeNormalizado }, { sigla: siglaFormatada }],
      },
    });

    if (clubeExistente) {
      throw new BadRequestException(
        'Já existe um clube cadastrado com este nome ou sigla.',
      );
    }

    const createdClub = await this.prisma.clube.create({
      data: {
        nome: createClubDto.name.trim(),
        nome_normalizado: nomeNormalizado,
        sigla: siglaFormatada,
        caixa: 300.0,
      },
    });

    return {
      id: createdClub.id,
      name: createdClub.nome,
      sigla: createdClub.sigla,
      balance: Number(createdClub.caixa),
    };
  }

  async findAll(orderBy?: string) {
    const clubes = await this.prisma.clube.findMany({
      include: {
        jogadores: {
          where: { excluido_em: null }, // Ignora jogadores demitidos logicamente
        },
      },
    });

    const clubesMapeados = clubes.map((clube) => {
      let squad_value = 0;

      clube.jogadores.forEach((jogador) => {
        squad_value += this.calculateMarketValue(
          Number(jogador.valor_base),
          jogador.condicao,
          jogador.agilidade,
          jogador.idade,
        );
      });

      const balance = Number(clube.caixa);
      const patrimony = balance + squad_value;

      return {
        id: clube.id,
        name: clube.nome,
        sigla: clube.sigla,
        balance: balance,
        squad_value: Number(squad_value.toFixed(2)),
        patrimony: Number(patrimony.toFixed(2)),
      };
    });

    if (orderBy === 'patrimony') {
      clubesMapeados.sort((a, b) => b.patrimony - a.patrimony); // Maior patrimônio primeiro
    } else {
      clubesMapeados.sort((a, b) => a.name.localeCompare(b.name)); // Ordem alfabética (padrão)
    }

    return clubesMapeados;
  }

  async findOne(id: number) {
    const clube = await this.prisma.clube.findUnique({
      where: { id },
      include: {
        jogadores: {
          where: { excluido_em: null },
          orderBy: { nome: 'asc' }, // Elenco ordenado alfabeticamente
        },
      },
    });

    if (!clube) {
      throw new NotFoundException(`Clube com ID ${id} não encontrado.`);
    }

    let squad_value = 0;

    const players = clube.jogadores.map((jogador) => {
      const marketValue = this.calculateMarketValue(
        Number(jogador.valor_base),
        jogador.condicao,
        jogador.agilidade,
        jogador.idade,
      );
      squad_value += marketValue;

      return {
        id: jogador.id,
        name: jogador.nome,
        position: jogador.posicao,
        agility: jogador.agilidade,
        age: jogador.idade,
        condition: jogador.condicao,
        base_value: Number(jogador.valor_base),
        market_value: marketValue,
        pace: jogador.velocidade,
        shooting: jogador.finalizacao,
        passing: jogador.passe,
        dribbling: jogador.drible,
        defending: jogador.defesa,
        physical: jogador.fisico,
        potential: jogador.potencial,
        overall: this.calculateOverall(jogador.posicao as PositionType, {
          pace: jogador.velocidade,
          shooting: jogador.finalizacao,
          passing: jogador.passe,
          dribbling: jogador.drible,
          defending: jogador.defesa,
          physical: jogador.fisico,
        }),
        club_id: jogador.clube_id,
      };
    });

    const balance = Number(clube.caixa);
    const patrimony = balance + squad_value;

    return {
      id: clube.id,
      name: clube.nome,
      sigla: clube.sigla,
      balance: balance,
      squad_value: Number(squad_value.toFixed(2)),
      patrimony: Number(patrimony.toFixed(2)),
      players, // Devolve o array formatado
    };
  }
}
