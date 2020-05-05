import Transaction from '../models/Transaction';
import fs from 'fs';
import csvParse from 'csv-parse';
import { getRepository, In, getCustomRepository } from 'typeorm';
import Category from '../models/Category';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface CSVTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute(filePath: string): Promise<Transaction[]> {
    const fileReadStream = fs.createReadStream(filePath);
    const parser = csvParse({
      from_line: 2,
    });

    const parserCsv = fileReadStream.pipe(parser);

    const categoriesFromCsv = new Set<string>();
    const transactionsFromCsv: CSVTransaction[] = [];

    parserCsv.on('data', async line => {
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );
      if (!title || !type || !value) return;

      categoriesFromCsv.add(category);
      transactionsFromCsv.push({ title, type, value, category });
    });

    await new Promise(resolve => parserCsv.on('end', resolve));

    const categoryTitles = Array.from(categoriesFromCsv.values());
    const categoriesFull = await this.findOrCreateCategories(categoryTitles);
    const transactionRepository = getCustomRepository(TransactionsRepository);
    const transactions = transactionRepository.create(
      transactionsFromCsv.map(transaction => ({
        ...transaction,
        category: categoriesFull.find(
          category => transaction.category === category.title,
        ),
      })),
    );
    await transactionRepository.save(transactions);
    await fs.promises.unlink(filePath);
    return transactions;
  }

  private async findOrCreateCategories(titles: string[]) {
    const categoryRepository = getRepository(Category);
    const categoriesDb = await categoryRepository.find({
      where: {
        title: In(titles),
      },
    });
    const categoriesToInsert = categoryRepository.create(titles
      .filter(title => !categoriesDb.some(category => title === category.title))
      .map(title => ({ title })));
    await categoryRepository.save(categoriesToInsert);
    const categoriesFull = [...categoriesDb, ...categoriesToInsert];
    return categoriesFull;
  }
}

export default ImportTransactionsService;
