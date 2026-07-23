import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import { SimulatedAccount } from "./SimulatedAccount";

export type TxDirection = "credit" | "debit";

// Telecom categories map directly onto real Airtel Money / TNM Mpamba
// USSD menu options (Send Money, Cash Out, Buy Airtime, Pay Bill), plus
// their natural credit-side counterparts (Receive Money, Cash In) which
// don't appear as menu items themselves but generate transactions when
// someone else sends to this member or deposits via an agent.
// Bank categories are separate because a bank statement narrates
// differently (salary batches, standing orders) than a mobile money log.
export type TelecomCategory =
  | "buy_airtime"
  | "buy_bundle"
  | "send_money"
  | "receive_money"
  | "cash_in"
  | "cash_out"
  | "pay_bill"
  | "merchant_payment";

export type BankCategory = "salary_credit" | "merchant_payment" | "savings_transfer" | "atm_withdrawal";

export type TxCategory = TelecomCategory | BankCategory;

@Entity()
export class SimulatedTransaction {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => SimulatedAccount, (account) => account.transactions, { onDelete: "CASCADE" })
  account!: SimulatedAccount;

  @Column()
  accountId!: string;

  @Column({ type: "varchar" })
  direction!: TxDirection;

  @Column("numeric")
  amountMWK!: number;

  @Column({ type: "varchar" })
  category!: TxCategory;

  @Column()
  counterparty!: string;

  @Column()
  reference!: string; // e.g. "MP7X9K2LQ1A4" or "AM3F8B1D9E22" — matches real confirmation SMS format

  @Column()
  description!: string;

  @Column({ type: "timestamptz" })
  occurredAt!: Date;

  @Column("numeric")
  balanceAfter!: number;
}
