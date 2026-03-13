const express = require("express");
const router = express.Router();

const { authMiddleware } = require("../middleware/auth.middleware"); // JWT auth
const authorizeRoles = require("../middleware/role.middleware");  // RBAC middleware
const { freezeAccount, reverseTransaction, viewAllAccounts } = require("../controllers/admin.controller");

// Only Admins can use these routes
router.post("/freeze-account", authMiddleware, authorizeRoles("Admin"), freezeAccount);
router.post("/reverse-transaction", authMiddleware, authorizeRoles("Admin"), reverseTransaction);
router.get("/view-accounts", authMiddleware, authorizeRoles("Admin"), viewAllAccounts);

module.exports = router;
