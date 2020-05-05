import Category from '../models/Category';
import { getRepository } from 'typeorm';

class FindOrCreateCategoryService {
  public async execute(title: string): Promise<Category> {
    const categoryRepository = getRepository(Category);

    let categoryInstance = await categoryRepository.findOne({
      where: { title: title },
    });

    if (!categoryInstance) {
      categoryInstance = categoryRepository.create({ title: title });
      await categoryRepository.save(categoryInstance);
    }

    return categoryInstance;
  }
}

export default FindOrCreateCategoryService;
