# Passe — Gestão de liga

Aplicação web full stack para gerenciar uma liga fictícia de futebol. Permite cadastrar e filtrar jogadores, organizar clubes e escalações, comprar e vender atletas com contratos, consultar o histórico financeiro, jogar partidas e ver a classificação. A API aplica as regras de negócio e persiste os dados em PostgreSQL; o frontend consome a API.

## Aplicação publicada

- **Frontend:** [football-league-chi.vercel.app](https://football-league-chi.vercel.app/)
- **Backend (API):** [football-league-o3yl.onrender.com](https://football-league-o3yl.onrender.com)
- **Documentação Swagger:** [football-league-o3yl.onrender.com/docs](https://football-league-o3yl.onrender.com/docs)

## 1. Pré-requisitos

O procedimento abaixo foi preparado para **Ubuntu 24.04 LTS**. Instale antes:

- **Node.js 22 LTS**, versão **22.12 ou posterior**, com **npm 10 ou posterior** (npm acompanha o Node.js).
- **Docker Engine 27 ou posterior** e o plugin **Docker Compose v2** (`docker compose`). PostgreSQL é iniciado pela imagem pública `postgres:16-alpine`; não é necessário instalar PostgreSQL no host.
- **Git 2.x** para clonar o repositório.

Não é necessário instalar Nest CLI, Prisma CLI, Vite ou PostgreSQL globalmente. Os CLIs JavaScript são chamados pelas dependências instaladas com npm e `npx`.

## 2. Banco de dados: criação e recriação

Clone o repositório e entre na raiz:

```shell
git clone https://github.com/mc4rvalho/football-league.git
cd football-league
```

Inicie o PostgreSQL (comando executado na raiz do repositório):

```shell
docker compose up -d db
```

O banco é criado pelo PostgreSQL com o nome `senai_db`. As migrations versionadas em `backend/prisma/migrations/` criam as tabelas e não inserem dados de exemplo. Para aplicar as migrations pela primeira vez, siga o passo a passo do backend na próxima seção. O banco fica sem jogadores, clubes, transações ou partidas.

Para **apagar o banco e recriá-lo vazio**, pare os serviços e remova o volume (comando na raiz; esta ação apaga todos os dados locais):

```shell
docker compose down --volumes
```

Inicie um novo volume de banco:

```shell
docker compose up -d db
```

Depois, na pasta `backend/`, reaplique as migrations:

```shell
npx prisma migrate deploy
```

Como alternativa, com o banco já iniciado, o comando abaixo também apaga os dados e recria o esquema a partir das migrations (na pasta `backend/`):

```shell
npx prisma migrate reset --force
```

Não há seed automático nem massa de exemplo no fluxo de criação ou reset.

## 3. Instalar e executar no Ubuntu 24.04

Os arquivos `backend/package-lock.json` e `frontend/package-lock.json` estão versionados. Use `npm ci` para instalar exatamente as versões travadas.

### 3.1 Backend — terminal 1

Com o diretório atual na raiz do repositório, entre em `backend/`, crie o arquivo de ambiente, instale as dependências, aplique as migrations e inicie a API:

```shell
cd backend
cp .env.example .env
npm ci
npx prisma migrate deploy
npm run start:dev
```

A origem da API é **`http://localhost:4000`**. O frontend acrescenta `/api/v1` automaticamente. A documentação interativa fica em `http://localhost:4000/docs` e o documento OpenAPI em `http://localhost:4000/openapi.json`.

### 3.2 Frontend — terminal 2

Abra outro terminal na raiz do repositório e execute:

```shell
cd frontend
cp .env.example .env
npm ci
npm run dev
```

A interface fica em **`http://localhost:5173`**. `VITE_API_URL` recebe somente a origem `http://localhost:4000`; o cliente Axios acrescenta `/api/v1`.

### 3.3 Subir somente o banco com Docker Compose

O Docker Compose da raiz inicia somente o PostgreSQL. Backend e frontend são instalados e executados com npm nos passos 3.1 e 3.2.

```shell
docker compose up -d db
```

Use `docker compose down` para parar e remover o container, preservando os dados no volume. Para apagar também o banco local, use `docker compose down --volumes`.

### 3.4 Testes, lint e formatação

Execute os comandos abaixo dentro de cada pasta. Testes e verificações terminam sem modo de observação e não alteram os arquivos:

```shell
# backend/
npm test
npm run lint
npm run format

# frontend/
npm test
npm run lint
npm run format
```

## 4. Variáveis de ambiente

Os arquivos de exemplo estão versionados e não contêm credenciais de produção:

- `backend/.env.example`: `PORT` (porta da API, padrão `4000`), `DATABASE_URL` (conexão PostgreSQL) e `CORS_ORIGIN` (origem autorizada do frontend).
- `frontend/.env.example`: `VITE_API_URL` (origem da API, sem `/api/v1`; padrão local `http://localhost:4000`).

Copie os exemplos para `.env` conforme os comandos acima. Os arquivos `.env` locais são ignorados pelo Git. As credenciais declaradas no Compose são apenas para desenvolvimento local; use credenciais próprias e seguras fora desse ambiente.

## 5. Estrutura de pastas e bibliotecas

```text
backend/
  prisma/                  Esquema e migrations do PostgreSQL
  src/players/              Cadastro, mercado e regras de jogadores
  src/clubs/                Clubes, elenco, escalação e transações
  src/matches/              Partidas, duelos e classificação
  src/prisma/               Acesso ao banco
  src/main.ts               Inicialização da API, CORS e documentação
frontend/
  src/pages/                Telas de início, jogadores, clubes, partidas e classificação
  src/components/           Componentes visuais separados por responsabilidade
  src/hooks/                Estado e ações da aplicação
  src/services/api.ts       Cliente Axios e URL base da API
docker-compose.yaml         PostgreSQL local (banco senai_db)
```

**Backend:** NestJS (`@nestjs/common`, `@nestjs/core` e `@nestjs/platform-express`) organiza a API, rotas e injeção de dependências; `@nestjs/mapped-types` reutiliza propriedades entre DTOs; `reflect-metadata` e RxJS dão suporte ao modelo de execução do NestJS; Prisma Client acessa os dados e Prisma CLI gera o cliente e aplica migrations; `@prisma/adapter-pg` e `pg` conectam Prisma ao PostgreSQL; `class-validator` e `class-transformer` validam e convertem dados de entrada; `@nestjs/swagger` publica a documentação OpenAPI; Jest e `ts-jest` executam os testes; ESLint e Prettier verificam código e formatação.

**Frontend:** React e React DOM constroem a interface por componentes; TypeScript verifica tipos; Vite executa o servidor local e gera a versão de produção; Tailwind CSS e `@tailwindcss/vite` fornecem estilos utilitários; Axios centraliza chamadas HTTP; Radix UI Dialog fornece diálogos acessíveis; `lucide-react` fornece ícones; `class-variance-authority`, `clsx` e `tailwind-merge` compõem e mesclam classes dos controles. Vitest executa os testes, Testing Library verifica a interface e jsdom fornece um DOM simulado; ESLint e Prettier verificam código e formatação.

**Infraestrutura:** Docker Compose inicia somente o PostgreSQL local a partir da imagem pública `postgres:16-alpine`. Backend e frontend rodam com npm fora do Docker. As dependências vêm do registro público npm e a imagem do banco vem do Docker Hub; não há submódulos, imagens próprias nem dependência de serviço hospedado pelo projeto.

## 6. Decisões e premissas

- O cliente recebe a origem da API sem prefixo; o serviço HTTP acrescenta `/api/v1` para as chamadas REST.
- O backend usa o fuso `America/Recife` (UTC−3) para datas e horários exibidos e calculados pela aplicação.
- Clubes novos começam com caixa de 300,00 moedas, definido como valor inicial no esquema do banco.
- Valores monetários são persistidos com duas casas decimais no PostgreSQL e os cálculos de mercado são arredondados para duas casas; o valor de mercado tem piso de 1 moeda.
- O banco local inicia vazio. Dados de demonstração não são inseridos automaticamente.
- O limite de elenco, regras de fidelidade, taxas, multas, desempates e critérios de duelo seguem as regras implementadas para o enunciado. A API é a fonte dos valores calculados.
- `start:dev` atende o desenvolvimento local; `start:prod` usa a porta `PORT` e escuta em `0.0.0.0`.

## 7. Funcionalidades não implementadas

A revisão do código e os testes disponíveis não apontaram funcionalidade obrigatória pendente. Entre os diferenciais, testes, lint e formatação passam no backend e no frontend; o backend também oferece OpenAPI/Swagger e logs de requisição. O Compose atual sobe somente o banco, não a aplicação completa em um comando. Há regras CSS responsivas, mas a utilização em 375 px ainda precisa de conferência visual antes da entrega.

## 8. Uso de inteligência artificial

Utilizei o OpenAI Codex como apoio de tech lead durante o desenvolvimento do backend e do frontend. Em cada tarefa, analisamos o contrato do projeto para entender o que era necessário e o que não fazia parte do escopo. O Codex ajudou a decompor as tarefas, mostrou caminhos de implementação, revisou alterações e explicou as decisões e os problemas encontrados. Eu estudava as orientações, aplicava ou adaptava as mudanças e decidia o que aceitar ou descartar. Aproveitei principalmente as sugestões alinhadas ao contrato e descartei ou corrigi as que não correspondiam ao comportamento esperado. Em algumas tarefas, o Codex também editou arquivos diretamente no ambiente de desenvolvimento, e eu revisei o resultado.

Utilizei o Gemini para estruturar as tarefas e organizar a documentação do projeto. As respostas das ferramentas foram usadas como apoio e conferidas em relação ao contrato e ao comportamento esperado da aplicação.
