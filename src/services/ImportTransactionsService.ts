import csvParse from 'csv-parse';
import fs from 'fs';
import path from 'path';
import { getCustomRepository, getRepository, In } from 'typeorm';
import uploadConfig from '../config/upload';

import Transaction from '../models/Transaction';
import Category from '../models/Category';
import TransactionsRepository from '../repositories/TransactionsRepository';

class ImportTransactionsService {
  async execute(filename: string): Promise<Transaction[]> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getRepository(Category);
    const filePath = path.join(uploadConfig.directory, filename);

    const readCSVStream = fs.createReadStream(filePath);

    const parseStream = csvParse({
      from_line: 2,
      ltrim: true,
      rtrim: true,
    });

    const parseCSV = readCSVStream.pipe(parseStream);

    const transactions: {
      title: string;
      type: 'income' | 'outcome';
      value: number;
      categoryTitle: string;
    }[] = [];

    const categoriesTitle: string[] = [];

    parseCSV.on('data', line => {
      const [title, type, value, categoryTitle] = line;

      transactions.push({ title, type, value, categoryTitle });
      categoriesTitle.push(categoryTitle);
    });
    await new Promise(resolve => {
      parseCSV.on('end', resolve);
    });

    const distinctCategories = Array.from(new Set(categoriesTitle));

    const existentCategories = await categoriesRepository.find({
      where: {
        title: In(distinctCategories),
      },
    });

    const newCategoriesTitle = distinctCategories.filter(
      title => !existentCategories.map(cat => cat.title).includes(title),
    );

    const newCategories = categoriesRepository.create(
      newCategoriesTitle.map(title => ({
        title,
      })),
    );

    await categoriesRepository.save(newCategories);

    const categories = [...existentCategories, ...newCategories];

    const transactionsToSave = transactionsRepository.create(
      transactions.map(({ title, type, value, categoryTitle }) => ({
        title,
        type,
        value,
        category: categories.find(category => category.title === categoryTitle),
      })),
    );

    await transactionsRepository.save(transactionsToSave);

    await fs.promises.unlink(filePath);

    return transactionsToSave;
  }
}

export default ImportTransactionsService;
