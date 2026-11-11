import { destinationRepository as repo } from '../repositories/destination.repository.js';
import { withTransaction } from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';
import { slugify } from '../utils/slugify.js';

// "Kerala" -> "kerala"; if taken -> "kerala-2", "kerala-3", ...
async function generateUniqueSlug(name) {
  const base = slugify(name) || 'destination';
  let slug = base;
  let counter = 2;
  while (await repo.slugExists(slug)) {
    slug = `${base}-${counter++}`;
  }
  return slug;
}

// Clear 400 errors instead of raw foreign key errors
async function assertReferencesExist({ countryId, categoryIds }) {
  if (countryId !== undefined && !(await repo.countryExists(countryId))) {
    throw ApiError.badRequest(`Country with id ${countryId} does not exist`);
  }
  if (categoryIds?.length) {
    const found = await repo.countExistingCategories(categoryIds);
    if (found !== categoryIds.length) {
      throw ApiError.badRequest('One or more categoryIds do not exist');
    }
  }
}

// Exactly ONE image is primary (the first one marked, or else the first image)
function normalizeImages(images = []) {
  const primaryIndex = Math.max(0, images.findIndex((img) => img.isPrimary));
  return images.map((img, index) => ({ url: img.url, isPrimary: index === primaryIndex }));
}

export const destinationService = {
  async list({ page, limit }) {
    const offset = (page - 1) * limit;
    const [items, total] = await Promise.all([
      repo.findAll({ limit, offset }),
      repo.countAll(),
    ]);
    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async getBySlug(slug) {
    const destination = await repo.findBySlug(slug);
    if (!destination) {
      throw ApiError.notFound(`Destination '${slug}' not found`);
    }
    return destination;
  },

  async create(input, userId = null) {
    await assertReferencesExist(input);
    const slug = await generateUniqueSlug(input.name);

    // Destination + categories + images saved together, or not at all
    await withTransaction(async (conn) => {
      const id = await repo.insert({ ...input, slug, createdBy: userId }, conn);
      await repo.replaceCategories(id, input.categoryIds, conn);
      await repo.insertImages(id, normalizeImages(input.images), conn);
    });

    return repo.findBySlug(slug);
  },

  async update(id, input) {
    const existing = await repo.findById(id);
    if (!existing) {
      throw ApiError.notFound(`Destination with id ${id} not found`);
    }

    await assertReferencesExist(input);

    await withTransaction(async (conn) => {
      await repo.update(id, input, conn);
      if (input.categoryIds) {
        await repo.replaceCategories(id, input.categoryIds, conn);
      }
    });

    // The slug stays the same even if the name changes, so shared links never break
    return repo.findBySlug(existing.slug);
  },

  async remove(id) {
    const affected = await repo.softDelete(id);
    if (affected === 0) {
      throw ApiError.notFound(`Destination with id ${id} not found`);
    }
  },
};