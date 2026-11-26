import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PropertyDocument } from './property-document.entity';
import { PropertyDocumentsController } from './property-documents.controller';
import { PropertyDocumentsService } from './property-documents.service';

@Module({
  imports: [TypeOrmModule.forFeature([PropertyDocument])],
  controllers: [PropertyDocumentsController],
  providers: [PropertyDocumentsService],
  exports: [PropertyDocumentsService],
})
export class PropertyDocumentsModule {}
