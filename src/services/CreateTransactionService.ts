import AppError from '../errors/AppError';

import { getCustomRepository } from 'typeorm';

import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';
import FindOrCreateCategoryService from './FindOrCreateCategoryService';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    const types = ['income', 'outcome'];

    if (!types.includes(type)) throw new AppError('Invalid transaction type');

    const transactionsRepository = getCustomRepository(TransactionsRepository);

    const { total } = await transactionsRepository.getBalance();

    if (type === 'outcome' && total < value)
      throw new AppError('Insufficient balance to execute this transaction');

    const findOrCreateCategoryService = new FindOrCreateCategoryService();
    const categoryInstance = await findOrCreateCategoryService.execute(
      category,
    );

    const transaction = transactionsRepository.create({
      title,
      value,
      type,
      category: categoryInstance,
    });

    await transactionsRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
