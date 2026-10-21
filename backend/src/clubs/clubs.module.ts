import { Module } from '@nestjs/common';
import { ClubsController } from './controllers/clubs.controller';
import { ClubsService } from './services/clubs.service';

@Module({
  controllers: [ClubsController],
  providers: [ClubsService],
})
export class ClubsModule {}
