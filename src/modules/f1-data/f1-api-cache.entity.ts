import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('f1_api_cache')
export class F1ApiCache {
  @PrimaryColumn({ type: 'varchar', length: 512 })
  cacheKey: string;

  @Column({ type: 'jsonb' })
  payload: object;

  @UpdateDateColumn()
  updatedAt: Date;
}
