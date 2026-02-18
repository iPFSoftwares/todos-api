import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn
} from "typeorm";
import { User } from "./User";

@Entity({ name: "sessions" })
export class Session {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  userId!: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: User;

  @Column({ type: "text" })
  tokenHash!: string;

  @Column({ type: "datetime" })
  expiresAt!: Date;

  @CreateDateColumn({ type: "datetime" })
  createdAt!: Date;
}
