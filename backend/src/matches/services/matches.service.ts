import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMatchDto } from '../dto/create-match.dto';

type PositionType = 'GOL' | 'ZAG' | 'LAT' | 'MEI' | 'ATA';

@Injectable()
export class MatchesService {
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
    condition: string,
  ): number {
    const weights: Record<PositionType, Record<string, number>> = {
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
    let weightedSum =
      stats.pace * w.pace +
      stats.shooting * w.shooting +
      stats.passing * w.passing +
      stats.dribbling * w.dribbling +
      stats.defending * w.defending +
      stats.physical * w.physical;

    if (condition === 'MAL_CONDICIONADO') {
      weightedSum *= 0.85;
    }

    return Math.round(weightedSum);
  }

  async createMatch(dto: CreateMatchDto) {
    if (dto.home_club_id === dto.away_club_id) {
      throw new BadRequestException(
        'O clube mandante e o visitante devem ser diferentes.',
      );
    }

    const [homeClub, awayClub] = await Promise.all([
      this.prisma.clube.findUnique({ where: { id: dto.home_club_id } }),
      this.prisma.clube.findUnique({ where: { id: dto.away_club_id } }),
    ]);

    if (!homeClub || !awayClub) {
      throw new NotFoundException(
        'Um ou ambos os clubes informados não existem.',
      );
    }

    const [homeStarters, awayStarters] = await Promise.all([
      this.prisma.jogador.findMany({
        where: { clube_id: dto.home_club_id, excluido_em: null },
        take: 11,
      }),
      this.prisma.jogador.findMany({
        where: { clube_id: dto.away_club_id, excluido_em: null },
        take: 11,
      }),
    ]);

    if (homeStarters.length !== 11 || awayStarters.length !== 11) {
      throw new BadRequestException(
        'Ambos os clubes precisam ter uma escalação válida com 11 titulares configurados antes da partida.',
      );
    }

    const getAvgOverall = (
      players: typeof homeStarters,
      posFilter?: (p: PositionType) => boolean,
    ) => {
      const filtered = posFilter
        ? players.filter((p) => posFilter(p.posicao as PositionType))
        : players;
      if (filtered.length === 0) return 0;

      const sum = filtered.reduce(
        (acc, p) =>
          acc +
          this.calculateOverall(
            p.posicao as PositionType,
            {
              pace: p.velocidade,
              shooting: p.finalizacao,
              passing: p.passe,
              dribbling: p.drible,
              defending: p.defesa,
              physical: p.fisico,
            },
            p.condicao,
          ),
        0,
      );
      return sum / filtered.length;
    };

    const homeGol = getAvgOverall(homeStarters, (p) => p === 'GOL');
    const awayGol = getAvgOverall(awayStarters, (p) => p === 'GOL');

    const homeAta = getAvgOverall(homeStarters, (p) => p === 'ATA');
    const awayAta = getAvgOverall(awayStarters, (p) => p === 'ATA');

    const homeDef = getAvgOverall(
      homeStarters,
      (p) => p === 'ZAG' || p === 'LAT',
    );
    const awayDef = getAvgOverall(
      awayStarters,
      (p) => p === 'ZAG' || p === 'LAT',
    );

    const homeMei = getAvgOverall(homeStarters, (p) => p === 'MEI');
    const awayMei = getAvgOverall(awayStarters, (p) => p === 'MEI');

    const homeOverallTeam = getAvgOverall(homeStarters);
    const awayOverallTeam = getAvgOverall(awayStarters);

    let homeScore = 0;
    let awayScore = 0;

    if (homeAta > awayGol + 3) homeScore++;
    if (awayAta > homeGol + 3) awayScore++;
    if (homeAta > awayDef + 2) homeScore++;
    if (awayAta > homeDef + 2) awayScore++;
    if (homeMei > awayMei + 4) homeScore++;
    if (awayMei > homeMei + 4) awayScore++;
    if (homeOverallTeam > awayOverallTeam + 5) homeScore++;
    if (awayOverallTeam > homeOverallTeam + 5) awayScore++;

    const match = await this.prisma.partida.create({
      data: {
        mandante_id: dto.home_club_id,
        visitante_id: dto.away_club_id,
        gols_mandante: homeScore,
        gols_visitante: awayScore,
        formacao_mandante: homeClub.formacao ?? '4-4-2',
        formacao_visitante: awayClub.formacao ?? '4-4-2',
        jogada_em: new Date(),
      },
    });

    return {
      id: match.id,
      round: 1,
      status: 'FINALIZADA',
      home_club: { id: homeClub.id, name: homeClub.nome, score: homeScore },
      away_club: { id: awayClub.id, name: awayClub.nome, score: awayScore },
    };
  }

  async findAllMatches(query: { round?: number; club_id?: number }) {
    const where: Prisma.PartidaWhereInput = {};
    if (query.club_id) {
      where.OR = [
        { mandante_id: Number(query.club_id) },
        { visitante_id: Number(query.club_id) },
      ];
    }

    const matches = await this.prisma.partida.findMany({
      where,
      include: { mandante: true, visitante: true },
      orderBy: { id: 'asc' },
    });

    return matches.map((m) => ({
      id: m.id,
      round: query.round ?? 1,
      status: 'FINALIZADA',
      home_club: {
        id: m.mandante.id,
        name: m.mandante.nome,
        score: m.gols_mandante,
      },
      away_club: {
        id: m.visitante.id,
        name: m.visitante.nome,
        score: m.gols_visitante,
      },
    }));
  }

  async findOneMatch(id: number) {
    const match = await this.prisma.partida.findUnique({
      where: { id },
      include: { mandante: true, visitante: true },
    });

    if (!match) {
      throw new NotFoundException(`Partida com ID ${id} não encontrada.`);
    }

    return {
      id: match.id,
      status: 'FINALIZADA',
      home_club: {
        id: match.mandante.id,
        name: match.mandante.nome,
        score: match.gols_mandante,
      },
      away_club: {
        id: match.visitante.id,
        name: match.visitante.nome,
        score: match.gols_visitante,
      },
    };
  }

  async getStandings() {
    const clubs = await this.prisma.clube.findMany();
    const finishedMatches = await this.prisma.partida.findMany();

    const tableMap = new Map<
      number,
      {
        id: number;
        name: string;
        points: number;
        played: number;
        wins: number;
        draws: number;
        losses: number;
        goals_for: number;
        goals_against: number;
        goal_difference: number;
      }
    >();

    clubs.forEach((c) => {
      tableMap.set(c.id, {
        id: c.id,
        name: c.nome,
        points: 0,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goals_for: 0,
        goals_against: 0,
        goal_difference: 0,
      });
    });

    finishedMatches.forEach((m) => {
      const home = tableMap.get(m.mandante_id);
      const away = tableMap.get(m.visitante_id);

      if (
        home &&
        away &&
        m.gols_mandante !== null &&
        m.gols_visitante !== null
      ) {
        home.played++;
        away.played++;

        home.goals_for += m.gols_mandante;
        home.goals_against += m.gols_visitante;
        home.goal_difference = home.goals_for - home.goals_against;

        away.goals_for += m.gols_visitante;
        away.goals_against += m.gols_mandante;
        away.goal_difference = away.goals_for - away.goals_against;

        if (m.gols_mandante > m.gols_visitante) {
          home.wins++;
          home.points += 3;
          away.losses++;
        } else if (m.gols_visitante > m.gols_mandante) {
          away.wins++;
          away.points += 3;
          home.losses++;
        } else {
          home.draws++;
          home.points += 1;
          away.draws++;
          away.points += 1;
        }
      }
    });

    return Array.from(tableMap.values()).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.goal_difference !== a.goal_difference)
        return b.goal_difference - a.goal_difference;
      if (b.goals_for !== a.goals_for) return b.goals_for - a.goals_for;
      return a.name.localeCompare(b.name);
    });
  }
}
