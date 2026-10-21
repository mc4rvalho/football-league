import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateClubDto } from '../dto/create-club.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';
type PositionType = 'GOL' | 'ZAG' | 'LAT' | 'MEI' | 'ATA';

@Injectable()
export class ClubsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // FUNÇÕES AUXILIARES DE CÁLCULO
  // ---------------------------------------------------------------------------
  private calculateMarketValue(baseValue: number, condition: string): number {
    let factor = 1.0;
    if (condition === 'LESIONADO') factor = 0.75;
    else if (condition === 'SUSPENSO') factor = 0.9;

    const marketValue = Math.round(baseValue * factor * 100) / 100;
    return Math.max(1.0, marketValue);
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
    // 1. Validar existência do clube
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

    // 2. Busca paginada de transações e totalizador
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

    // 3. Cálculo do resumo financeiro (summary)
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

    // 4. Mapeamento da listagem
    const data = transactions.map((t) => ({
      id: t.id,
      club_id: t.clube_id,
      player_id: t.jogador_id,
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

  // ---------------------------------------------------------------------------
  // OPERAÇÕES DO RECURSO (CRUD)
  // ---------------------------------------------------------------------------
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

      // Itera para somar o valor atualizado do elenco
      clube.jogadores.forEach((jogador) => {
        squad_value += this.calculateMarketValue(
          Number(jogador.valor_base),
          jogador.condicao,
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

    // Ordenação combinada em memória
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

    // Mapeia o elenco inteiro formatado para inglês
    const players = clube.jogadores.map((jogador) => {
      const marketValue = this.calculateMarketValue(
        Number(jogador.valor_base),
        jogador.condicao,
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
