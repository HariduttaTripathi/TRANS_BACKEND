// src/middleware/role.middleware.js
module.exports = function authorizeRoles(...allowedRoles) {
    return (req, res, next) => {
        const userRole = req.user?.role; // must exist from authMiddleware
        if (!userRole || !allowedRoles.includes(userRole)) {
            return res.status(403).json({ message: "Access denied" });
        }
        next();
    };
};