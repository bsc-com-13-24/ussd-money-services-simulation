import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

export type CheckResult =
  | "success"
  | "bad_client_credentials"
  | "invalid_token"
  | "expired_token"
  | "phone_mismatch"
  | "insufficient_scope"
  | "member_not_found";

// Every request, successful or rejected, is logged here — this is CIS's
// side of the "every read is logged with who, when, and why" requirement.
@Entity()
export class RequestLog {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ nullable: true })
  clientId?: string;

  @Column({ nullable: true })
  phoneQueried?: string;

  @Column({ type: "varchar" })
  checkResult!: CheckResult;

  @CreateDateColumn()
  respondedAt!: Date;
}
