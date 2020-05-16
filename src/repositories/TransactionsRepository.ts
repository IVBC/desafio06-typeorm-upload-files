import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const transactions = await this.find();

    const reducerSum = (acm: number, value: number): number => acm + value;

    const sumIncome = transactions
      .filter(transaction => transaction.type === 'income')
      .map(transaction => transaction.value)
      .reduce(reducerSum, 0);

    const sumOutcome = transactions
      .filter(transaction => transaction.type === 'outcome')
      .map(transaction => transaction.value)
      .reduce(reducerSum, 0);

    const total = sumIncome - sumOutcome;

    const balance: Balance = { income: sumIncome, outcome: sumOutcome, total };

    return balance;
  }
}

export default TransactionsRepository;
