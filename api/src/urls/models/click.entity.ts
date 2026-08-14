import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('clicks')
export class Click {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'short_code' })
  shortCode!: string;

  @Column({ name: 'clicked_at' })
  clickedAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;
}
