import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from "typeorm";
import { SimulatedAccount } from "./SimulatedAccount";

// The join key with Mphamvu Hub's own User table is the phone number —
// the two services never share a numeric/UUID user id, only this.
@Entity()
export class SimulatedMember {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true })
  phone!: string;

  @Column()
  displayName!: string;

  // Every simulated member is auto-provisioned with a demo PIN so the
  // USSD simulator's "Enter PIN to confirm" step checks something real.
  // Set once at creation (see internal.route.ts) — never returned by
  // any endpoint. THE DEFAULT DEMO PIN IS "1234" FOR EVERY MEMBER —
  // this is fine for a local hackathon demo and would never be
  // acceptable outside one.
  @Column()
  pinHash!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @OneToMany(() => SimulatedAccount, (account) => account.member)
  accounts!: SimulatedAccount[];
}
