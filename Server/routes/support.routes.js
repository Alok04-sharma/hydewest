const express = require("express");
const authMiddleware = require("../middleware/auth.middleware");
const roleMiddleware = require("../middleware/role.middleware");
const ROLES = require("../constants/roles");
const {
  createSupportTicket,
  getMySupportTickets,
  getAdminSupportTickets,
  updateAdminSupportTicket,
} = require("../controllers/support.controller");

const router = express.Router();
router.use(authMiddleware);
router.get("/my", getMySupportTickets);
router.post("/", createSupportTicket);
router.get("/admin", roleMiddleware(ROLES.OWNER, ROLES.SUPER_ADMIN), getAdminSupportTickets);
router.patch("/admin/:ticketId", roleMiddleware(ROLES.OWNER, ROLES.SUPER_ADMIN), updateAdminSupportTicket);
module.exports = router;
