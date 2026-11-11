import { reportService } from '../services/report.service.js';

export const reportController = {
  async topRated(req, res) {
    res.json({ success: true, data: await reportService.topRated(req.validated.query) });
  },
  async countryStats(req, res) {
    res.json({ success: true, data: await reportService.countryStats() });
  },
  async bestPerCountry(req, res) {
    res.json({ success: true, data: await reportService.bestPerCountry() });
  },
  async topReviewers(req, res) {
    res.json({ success: true, data: await reportService.topReviewers(req.validated.query) });
  },
  async bookingStats(req, res) {
    res.json({ success: true, data: await reportService.bookingStats() });
  },
};
