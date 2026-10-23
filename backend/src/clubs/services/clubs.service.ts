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
    query: {
      page?: number;
      limit?: number;
      type?: string;
      player_id?: number | string;
    },
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
      const types = query.type
        .split(',')
        .map((type) => type.trim().toUpperCase())
        .filter(Boolean);
      if (types.length === 1) whereCondition.tipo = types[0];
      else if (types.length) whereCondition.tipo = { in: types };
    }
    if (query.player_id) whereCondition.jogador_id = Number(query.player_id);

    const [total, transactions, summaryTransactions] = await Promise.all([
      this.prisma.transacao.count({ where: whereCondition }),
      this.prisma.transacao.findMany({
        where: whereCondition,
        skip,
        take: limit,
        orderBy: { criado_em: 'desc' },
      }),
      this.prisma.transacao.findMany({ where: whereCondition }),
    ]);

    const data = transactions.map((t) => ({
      id: t.id,
      club_id: t.clube_id,
      player_id: t.jogador_id,
      player_name: t.nome_jogador,
      type: t.tipo,
      value: Number(t.valor),
      fee: Number(t.taxa),
      penalty: Number(t.multa),
      profit: t.lucro === null ? null : Number(t.lucro),
      cash_change: Number(t.variacao_caixa),
      created_at: t.criado_em,
    }));

    const summary = summaryTransactions.reduce(
      (totals, transaction) => {
        const value = Number(transaction.valor);
        const fee = Number(transaction.taxa);
        const penalty = Number(transaction.multa);
        const profit =
          transaction.lucro === null ? 0 : Number(transaction.lucro);
        if (transaction.tipo === 'COMPRA') totals.total_spent += value + fee;
        else totals.total_received += Number(transaction.variacao_caixa);
        totals.total_fees += fee;
        totals.total_penalties += penalty;
        totals.total_profit += profit;
        return totals;
      },
      {
        total_spent: 0,
        total_received: 0,
        total_fees: 0,
        total_penalties: 0,
        total_profit: 0,
      },
    );

    return {
      data,
      summary: Object.fromEntries(
        Object.entries(summary).map(([key, value]) => [
          key,
          Number(value.toFixed(2)),
        ]),
      ),
      meta: {
        total_items: total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async exportTransactionsCsv(
    clubId: number,
    query: { type?: string; player_id?: string },
  ): Promise<string> {
    const club = await this.prisma.clube.findUnique({
      where: { id: clubId },
    });

    if (!club) {
      throw new NotFoundException(`Clube com ID ${clubId} não encontrado.`);
    }

    const where: Prisma.TransacaoWhereInput = { clube_id: clubId };
    if (query.type) {
      const types = query.type
        .split(',')
        .map((type) => type.trim().toUpperCase())
        .filter(Boolean);
      if (types.length === 1) where.tipo = types[0];
      else if (types.length) where.tipo = { in: types };
    }
    if (query.player_id) where.jogador_id = Number(query.player_id);
    const transactions = await this.prisma.transacao.findMany({
      where,
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

    const normalizarNome = (nome: string) =>
      nome
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('pt-BR')
        .replace(/\s+/g, ' ');
    const nomeNormalizado = normalizarNome(createClubDto.name);
    const siglaFormatada = createClubDto.sigla.trim().toUpperCase();

    const clubesExistentes = await this.prisma.clube.findMany({
      select: { nome: true, nome_normalizado: true, sigla: true },
    });
    const clubeComMesmoNome = clubesExistentes.find(
      (clube) =>
        normalizarNome(clube.nome) === nomeNormalizado ||
        normalizarNome(clube.nome_normalizado || '') === nomeNormalizado,
    );
    const clubeComMesmaSigla = clubesExistentes.find(
      (clube) =>
        clube.sigla.trim().toLocaleUpperCase('pt-BR') === siglaFormatada,
    );

    if (clubeComMesmoNome) {
      throw new BadRequestException(
        `Já existe um clube com o nome “${clubeComMesmoNome.nome}”.`,
      );
    }
    if (clubeComMesmaSigla)
      throw new BadRequestException(
        `Já existe um clube com a sigla “${clubeComMesmaSigla.sigla}”.`,
      );

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
      acronym: createdClub.sigla,
      cash: Number(createdClub.caixa),
    };
  }

  async findAll(orderBy?: string) {
    const clubes = await this.prisma.clube.findMany({
      include: {
        jogadores: {
          where: { excluido_em: null },
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
        acronym: clube.sigla,
        cash: balance,
        squad_value: Number(squad_value.toFixed(2)),
        net_worth: Number(patrimony.toFixed(2)),
      };
    });

    if (orderBy === 'patrimony' || orderBy === 'net_worth') {
      clubesMapeados.sort((a, b) => b.net_worth - a.net_worth);
    } else {
      clubesMapeados.sort((a, b) => a.name.localeCompare(b.name));
    }

    return clubesMapeados;
  }

  async findOne(id: number) {
    const clube = await this.prisma.clube.findUnique({
      where: { id },
      include: {
        jogadores: {
          where: { excluido_em: null },
          orderBy: { nome: 'asc' },
          include: {
            contratos: {
              where: { situacao: 'ATIVO' },
              orderBy: { iniciado_em: 'desc' },
              take: 1,
            },
          },
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
        contract: jogador.contratos[0]
          ? {
              loyalty_until: jogador.contratos[0].fidelidade_ate,
              remaining_days: Math.max(
                0,
                Math.ceil(
                  (jogador.contratos[0].fidelidade_ate.getTime() - Date.now()) /
                    86400000,
                ),
              ),
              penalty_rate: (() => {
                const days = Math.max(
                  0,
                  Math.ceil(
                    (jogador.contratos[0].fidelidade_ate.getTime() -
                      Date.now()) /
                      86400000,
                  ),
                );
                return days === 0 ? 0 : days <= 30 ? 5 : days <= 180 ? 10 : 20;
              })(),
              purchase_value: Number(jogador.contratos[0].valor_compra),
            }
          : undefined,
      };
    });

    const balance = Number(clube.caixa);
    const patrimony = balance + squad_value;

    return {
      id: clube.id,
      name: clube.nome,
      acronym: clube.sigla,
      cash: balance,
      squad_value: Number(squad_value.toFixed(2)),
      net_worth: Number(patrimony.toFixed(2)),
      players,
    };
  }
}
