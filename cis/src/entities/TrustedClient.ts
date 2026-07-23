import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

// Not typically written via the app at runtime — trusted clients are
// provisioned from the TRUSTED_CLIENTS env var (see config/env.ts) and
// mirrored here only if you want a persisted, queryable audit trail.
@Entity()
export class TrustedClient {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true })
  clientId!: string;

  @Column()
  name!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
