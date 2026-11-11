import fs from 'node:fs/promises';
import path from 'node:path';
import { imageRepository as repo } from '../repositories/image.repository.js';
import { withTransaction } from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';
import { isRealImage } from '../utils/imageCheck.js';
import { UPLOAD_DIR } from '../middlewares/upload.js';

const removeFiles = (files) =>
  Promise.all(files.map((f) => fs.unlink(f.path).catch(() => {})));

export const imageService = {
  async upload(destinationId, files = []) {
    if (files.length === 0) throw ApiError.badRequest('Attach at least one file in the "images" field');

    try {
      if (!(await repo.destinationExists(destinationId))) {
        throw ApiError.notFound(`Destination with id ${destinationId} not found`);
      }
      for (const file of files) {
        if (!(await isRealImage(file.path))) {
          throw ApiError.badRequest(`${file.originalname} is not a real image file`);
        }
      }

      await withTransaction(async (conn) => {
        const needsPrimary = !(await repo.hasPrimary(destinationId, conn));
        await repo.insertMany(destinationId, files.map((file, i) => ({
          url: `/uploads/${file.filename}`,
          fileName: file.filename,
          isPrimary: needsPrimary && i === 0,
        })), conn);
      });
    } catch (err) {
      await removeFiles(files); // never leave orphan files on disk
      throw err;
    }

    return repo.listByDestination(destinationId);
  },

  async remove(destinationId, imageId) {
    const image = await repo.findById(imageId, destinationId);
    if (!image) throw ApiError.notFound(`Image with id ${imageId} not found`);

    await withTransaction(async (conn) => {
      await repo.delete(imageId, conn);
      if (image.isPrimary) await repo.promoteFirst(destinationId, conn);
    });

    // Delete the file AFTER the DB commit (seed images have no local file)
    if (image.fileName) {
      await fs.unlink(path.join(UPLOAD_DIR, path.basename(image.fileName))).catch(() => {});
    }
  },
};