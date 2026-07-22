import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn } from "typeorm";
import { SimulatedMember } from "./SimulatedMember";
import { SimulatedTransaction } from "./SimulatedTransaction";

export type InstitutionType = "telecom" | "bank";

@Entity()
export class SimulatedAccount {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => SimulatedMember, (member) => member.accounts, { onDelete: "CASCADE" })
  member!: SimulatedMember;

  @Column()
  memberId!: string;

  @Column({ type: "varchar" })
  institutionType!: InstitutionType;

  @Column()
  institutionName!: string; // e.g. "Airtel Money", "National Bank of Malawi"

  @Column()
  accountNumberMasked!: string; // e.g. "***-****-2291" — never a real number

  // The single source of truth for "how much money does this account
  // have right now". Every write to SimulatedTransaction must update
  // this in the same DB transaction — see internal.route.ts.
  @Column("numeric", { default: 0 })
  balanceMWK!: number;

  @CreateDateColumn()
  openedAt!: Date;

  @OneToMany(() => SimulatedTransaction, (tx) => tx.account)
  transactions!: SimulatedTransaction[];
}
