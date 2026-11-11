import { reportRepository as repo } from '../repositories/report.repository.js';

export const reportService = {
  topRated: (query) => repo.topRated(query),
  countryStats: () => repo.countryStats(),
  bestPerCountry: () => repo.bestPerCountry(),
  topReviewers: (query) => repo.topReviewers(query),
  bookingStats: () => repo.bookingStats(),
};
