const express = require("express");
const router = express.Router();
const { login, register, getMe, updateUser, googleLogin } = require("../controllers/authController");

const { protect } = require("../middleware/authMiddleware");

router.post("/login", login);
router.post("/register", register);
router.post("/google", googleLogin);
router.get("/me", protect, getMe);
router.put("/me", protect, updateUser);

module.exports = router;