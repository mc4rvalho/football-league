import {
  Injectable,
  NotFoundException,
  type PipeTransform,
} from '@nestjs/common';

@Injectable()
export class ResourceIdPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    if (!/^[1-9]\d*$/.test(value)) {
      throw new NotFoundException('Recurso não encontrado.');
    }

    const id = Number(value);
    if (!Number.isSafeInteger(id) || id > 2_147_483_647) {
      throw new NotFoundException('Recurso não encontrado.');
    }

    return id;
  }
}
