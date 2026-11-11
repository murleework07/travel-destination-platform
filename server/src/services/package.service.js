import { packageRepository as repo } from '../repositories/package.repository.js';
import { ApiError } from '../utils/ApiError.js';

export const packageService = {
  async getById(id) {
    const pkg = await repo.findById(id);
    if (!pkg) throw ApiError.notFound(`Package with id ${id} not found`);
    return pkg;
  },
};