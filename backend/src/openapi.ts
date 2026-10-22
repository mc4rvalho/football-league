const operation = (
  summary: string,
  tags: string[],
  parameters: unknown[] = [],
) => ({
  summary,
  tags,
  ...(parameters.length ? { parameters } : {}),
  responses: {
    '200': { description: 'Operação concluída' },
    '400': { description: 'Dados inválidos' },
    '404': { description: 'Recurso não encontrado' },
    '409': { description: 'Regra de negócio recusou a operação' },
  },
});

const body = (required: string[], properties: Record<string, unknown>) => ({
  required: true,
  content: {
    'application/json': {
      schema: { type: 'object', required, properties },
    },
  },
});

const playerId = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'integer' },
};
const clubId = { ...playerId };
const position = { type: 'string', enum: ['GOL', 'ZAG', 'LAT', 'MEI', 'ATA'] };
const condition = {
  type: 'string',
  enum: ['APTO', 'MAL_CONDICIONADO', 'DOENTE'],
};

export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Passe API',
    version: '1.0.0',
    description: 'API de jogadores, clubes, mercado, partidas e classificação.',
  },
  servers: [{ url: '/api/v1' }],
  tags: [
    { name: 'Players' },
    { name: 'Clubs' },
    { name: 'Matches' },
    { name: 'Standings' },
  ],
  paths: {
    '/players': {
      get: operation(
        'Lista jogadores com busca, filtros, ordenação e paginação.',
        ['Players'],
        [
          ...[
            'search',
            'position',
            'condition',
            'free',
            'club_id',
            'min_age',
            'max_age',
            'min_value',
            'max_value',
            'sort',
            'page',
            'limit',
          ].map((name) => ({ name, in: 'query', schema: { type: 'string' } })),
        ],
      ),
      post: {
        ...operation('Cadastra jogador livre.', ['Players']),
        requestBody: body(
          [
            'name',
            'position',
            'agility',
            'age',
            'pace',
            'shooting',
            'passing',
            'dribbling',
            'defending',
            'physical',
            'potential',
          ],
          {
            name: { type: 'string' },
            position,
            agility: { type: 'integer' },
            age: { type: 'integer' },
            pace: { type: 'integer' },
            shooting: { type: 'integer' },
            passing: { type: 'integer' },
            dribbling: { type: 'integer' },
            defending: { type: 'integer' },
            physical: { type: 'integer' },
            potential: { type: 'integer' },
          },
        ),
      },
    },
    '/players/{id}': {
      get: operation('Consulta jogador.', ['Players'], [playerId]),
      put: {
        ...operation(
          'Edita os dados cadastrais do jogador.',
          ['Players'],
          [playerId],
        ),
        requestBody: body(['name', 'position', 'agility', 'age'], {
          name: { type: 'string' },
          position,
          agility: { type: 'integer' },
          age: { type: 'integer' },
        }),
      },
      delete: operation('Exclui jogador livre.', ['Players'], [playerId]),
    },
    '/players/{id}/condition': {
      patch: {
        ...operation('Altera condição física.', ['Players'], [playerId]),
        requestBody: body(['condition'], { condition }),
      },
    },
    '/players/{id}/buy': {
      post: {
        ...operation(
          'Compra jogador livre com contrato de fidelidade.',
          ['Players'],
          [playerId],
        ),
        requestBody: body(['club_id', 'loyalty_until'], {
          club_id: { type: 'integer' },
          loyalty_until: { type: 'string', format: 'date-time' },
        }),
      },
    },
    '/players/{id}/sell': {
      post: operation('Vende jogador do elenco.', ['Players'], [playerId]),
    },
    '/clubs': {
      get: operation('Lista clubes.', ['Clubs']),
      post: {
        ...operation('Cria clube.', ['Clubs']),
        requestBody: body(['name', 'acronym'], {
          name: { type: 'string' },
          acronym: { type: 'string' },
        }),
      },
    },
    '/clubs/{id}': {
      get: operation('Consulta clube e elenco.', ['Clubs'], [clubId]),
    },
    '/clubs/{id}/transactions': {
      get: operation(
        'Lista transações com filtros e totais.',
        ['Clubs'],
        [
          clubId,
          { name: 'type', in: 'query', schema: { type: 'string' } },
          { name: 'player_id', in: 'query', schema: { type: 'integer' } },
        ],
      ),
    },
    '/clubs/{id}/transactions/export': {
      get: operation(
        'Exporta histórico de transações em CSV.',
        ['Clubs'],
        [clubId],
      ),
    },
    '/clubs/{id}/lineup': {
      get: operation('Consulta escalação atual.', ['Clubs'], [clubId]),
      put: {
        ...operation('Salva formação e cinco titulares.', ['Clubs'], [clubId]),
        requestBody: body(['formation', 'player_ids'], {
          formation: { type: 'string' },
          player_ids: { type: 'array', items: { type: 'integer' } },
        }),
      },
    },
    '/matches': {
      get: operation(
        'Lista histórico de partidas.',
        ['Matches'],
        [{ name: 'club_id', in: 'query', schema: { type: 'integer' } }],
      ),
      post: {
        ...operation('Joga partida entre dois clubes.', ['Matches']),
        requestBody: body(['home_club_id', 'away_club_id'], {
          home_club_id: { type: 'integer' },
          away_club_id: { type: 'integer' },
        }),
      },
    },
    '/matches/{id}': {
      get: operation(
        'Consulta uma partida e seus duelos.',
        ['Matches'],
        [playerId],
      ),
    },
    '/standings': {
      get: operation('Consulta a classificação da liga.', ['Standings']),
    },
  },
};
