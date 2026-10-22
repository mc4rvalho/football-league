import { Test, TestingModule } from '@nestjs/testing';
import { PlayersService } from '../services/players.service';
import { PlayersController } from './players.controller';

describe('PlayersController', () => {
  let controller: PlayersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlayersController],
      providers: [{ provide: PlayersService, useValue: {} }],
    }).compile();

    controller = module.get<PlayersController>(PlayersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
