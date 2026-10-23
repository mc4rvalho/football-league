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

    const [homeLineup, awayLineup] = await Promise.all([
      this.getStartingPlayers(dto.home_club_id),
      this.getStartingPlayers(dto.away_club_id),
    ]);
    if (homeLineup.length !== 5 || awayLineup.length !== 5) {
      throw new BadRequestException(
        `Escalação incompleta: ${homeLineup.length !== 5 ? homeClub.nome : awayClub.nome} não tem os 5 titulares.`,
      );
    }
    const unavailable = [...homeLineup, ...awayLineup].find(
      (p) => p.condicao === 'DOENTE',
    );
    if (unavailable) {
      throw new BadRequestException(
        `Escalação incompleta: ${unavailable.nome} está doente e não pode jogar.`,
      );
    }

    const duelPlan = (
      attackers: typeof homeLineup,
      defenders: typeof awayLineup,
    ) => {
      const keeper = defenders.find((p) => p.posicao === 'GOL')!;
      const fieldAttackers = attackers
        .filter((p) => p.posicao !== 'GOL')
        .sort((a, b) => {
          const order: Record<string, number> = {
            ATA: 0,
            MEI: 1,
            LAT: 2,
            ZAG: 3,
          };
          return order[a.posicao] - order[b.posicao];
        });
      const fieldDefenders = defenders
        .filter((p) => p.posicao !== 'GOL')
        .sort((a, b) => {
          const order: Record<string, number> = {
            ZAG: 0,
            LAT: 1,
            MEI: 2,
            ATA: 3,
          };
          return order[a.posicao] - order[b.posicao];
        });
      return fieldAttackers.slice(0, 3).map((attacker, index) => {
        const defender = index === 0 ? keeper : fieldDefenders[index - 1];
        const rawAttack =
          attacker.posicao === 'ATA'
            ? attacker.finalizacao
            : attacker.posicao === 'MEI'
              ? attacker.passe
              : attacker.drible;
        const rawDefense = defender?.defesa ?? 0;
        return {
          attacker,
          defender,
          attackAttribute:
            attacker.posicao === 'ATA'
              ? 'Finaliz.'
              : attacker.posicao === 'MEI'
                ? 'Passe'
                : 'Drible',
          attackValue: Math.round(
            rawAttack * (attacker.condicao === 'MAL_CONDICIONADO' ? 0.85 : 1),
          ),
          defenseValue: Math.round(
            rawDefense * (defender?.condicao === 'MAL_CONDICIONADO' ? 0.85 : 1),
          ),
        };
      });
    };
    const homeDuels = duelPlan(homeLineup, awayLineup);
    const awayDuels = duelPlan(awayLineup, homeLineup);
    const duels = [
      ...homeDuels.map((d, i) => ({
        ...d,
        attackingClubId: homeClub.id,
        order: i + 1,
      })),
      ...awayDuels.map((d, i) => ({
        ...d,
        attackingClubId: awayClub.id,
        order: i + 4,
      })),
    ];
    const match = await this.prisma.partida.create({
      data: {
        mandante_id: dto.home_club_id,
        visitante_id: dto.away_club_id,
        gols_mandante: homeDuels.filter((d) => d.attackValue > d.defenseValue)
          .length,
        gols_visitante: awayDuels.filter((d) => d.attackValue > d.defenseValue)
          .length,
        formacao_mandante: homeClub.formacao ?? '2-1-1',
        formacao_visitante: awayClub.formacao ?? '2-1-1',
        jogada_em: new Date(),
        duelos: {
          create: duels.map((d) => ({
            ordem: d.order,
            clube_atacante_id: d.attackingClubId,
            atacante_id: d.attacker.id,
            defensor_id: d.defender.id,
            nome_atacante: d.attacker.nome,
            nome_defensor: d.defender.nome,
            posicao_atacante: d.attacker.posicao,
            posicao_defensor: d.defender.posicao,
            condicao_atacante: d.attacker.condicao,
            condicao_defensor: d.defender.condicao,
            atributo_ataque: d.attackAttribute,
            atributo_defesa: 'Defesa',
            valor_ataque: d.attackValue,
            valor_defesa: d.defenseValue,
            gol: d.attackValue > d.defenseValue,
          })),
        },
      },
      include: {
        mandante: true,
        visitante: true,
        duelos: { orderBy: { ordem: 'asc' } },
      },
    });
    return this.mapMatch(match);
  }

  private async getStartingPlayers(clubId: number) {
    const lineup = await this.prisma.escalacao.findMany({
      where: { clube_id: clubId },
      include: { jogador: true },
      orderBy: [{ criado_em: 'asc' }, { jogador_id: 'asc' }],
    });
    return lineup.map((item) => item.jogador);
  }

  private mapMatch(
    match: Prisma.PartidaGetPayload<{
      include: { mandante: true; visitante: true; duelos: true };
    }>,
  ) {
    return {
      id: match.id,
      played_at: match.jogada_em,
      status: 'FINALIZADA',
      home: {
        club_id: match.mandante.id,
        club_name: match.mandante.nome,
        goals: match.gols_mandante,
        formation: match.formacao_mandante,
      },
      away: {
        club_id: match.visitante.id,
        club_name: match.visitante.nome,
        goals: match.gols_visitante,
        formation: match.formacao_visitante,
      },
      result:
        match.gols_mandante === match.gols_visitante
          ? 'Empate'
          : match.gols_mandante > match.gols_visitante
            ? 'Vitória do mandante'
            : 'Vitória do visitante',
      duels: match.duelos.map((d) => ({
        order: d.ordem,
        attacking_club_id: d.clube_atacante_id,
        attacker: {
          player_id: d.atacante_id,
          player_name: d.nome_atacante,
          position: d.posicao_atacante,
          condition: d.condicao_atacante,
          attribute: d.atributo_ataque,
          value: d.valor_ataque,
        },
        defender: {
          player_id: d.defensor_id,
          player_name: d.nome_defensor,
          position: d.posicao_defensor,
          condition: d.condicao_defensor,
          attribute: d.atributo_defesa,
          value: d.valor_defesa,
        },
        goal: d.gol,
      })),
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
      include: { mandante: true, visitante: true, duelos: true },
      orderBy: [{ jogada_em: 'desc' }, { id: 'desc' }],
    });
    return matches.map((m) => this.mapMatch(m));
  }

  async findOneMatch(id: number) {
    const match = await this.prisma.partida.findUnique({
      where: { id },
      include: {
        mandante: true,
        visitante: true,
        duelos: { orderBy: { ordem: 'asc' } },
      },
    });

    if (!match) {
      throw new NotFoundException(`Partida com ID ${id} não encontrada.`);
    }

    return this.mapMatch(match);
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

    return Array.from(tableMap.values())
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goal_difference !== a.goal_difference)
          return b.goal_difference - a.goal_difference;
        if (b.goals_for !== a.goals_for) return b.goals_for - a.goals_for;
        return a.name.localeCompare(b.name);
      })
      .map((row, index) => ({
        position: index + 1,
        club_id: row.id,
        club_name: row.name,
        played: row.played,
        wins: row.wins,
        draws: row.draws,
        losses: row.losses,
        goals_for: row.goals_for,
        goals_against: row.goals_against,
        goal_difference: row.goal_difference,
        points: row.points,
      }));
  }
}
