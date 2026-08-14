import { MigrationInterface, QueryRunner } from 'typeorm';

export class Initial1700000000000 implements MigrationInterface {
  name = 'Initial1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`SELECT 1`);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {}
}
