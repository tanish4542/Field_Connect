import express from 'express';
import { registerUser } from '../controllers/user.controller.js';
import { loginUser } from '../controllers/user.controller.js';
import { logoutUser } from '../controllers/user.controller.js';
import { refreshAccessToken } from '../controllers/user.controller.js';
import { upload } from '../middlewares/multer.middleware.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { forgotPassword, resetPassword } from '../controllers/user.controller.js';


const router = express.Router();

// Register route with avatar upload
router.post('/register', (req, res, next) => {
    upload.fields([
      { name: "avatar", maxCount: 1 }
    ])(req, res, function (err) {
      console.log("▶ req.body:", req.body);
      console.log("▶ req.files:", req.files);
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      registerUser(req, res, next);
    });
});

// Login route
router.post('/login', loginUser);

// Logout route (protected)
router.post('/logout', verifyJWT, logoutUser);

// Profile route (protected)
router.get("/profile", verifyJWT, async (req, res) => {
  res.json({ user: req.user });
});

// Refresh token route (protected)
router.post("/refresh-token", refreshAccessToken);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
export default router; 

