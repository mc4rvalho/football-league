import { NotFoundException } from '@nestjs/common';
import { ResourceIdPipe } from './resource-id.pipe';

describe('ResourceIdPipe', () => {
  const pipe = new ResourceIdPipe();

  it('converts a canonical positive integer ID', () => {
    expect(pipe.transform('42')).toBe(42);
  });

  it.each(['0', '01', '-1', '1.5', 'abc', '2147483648'])(
    'treats %s as a missing resource ID',
    (value) => {
      expect(() => pipe.transform(value)).toThrow(NotFoundException);
    },
  );
});
