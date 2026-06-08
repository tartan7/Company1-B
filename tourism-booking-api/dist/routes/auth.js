import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { UserService } from '../services/userService';
import { validateEmail, validatePassword, sanitizeInput } from '../middleware/validators';
const router = Router();
const loginLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: 'Too many login attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});
const registerLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: 'Too many registration attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});
router.post('/register', registerLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ error: 'Email and password are required' });
            return;
        }
        const sanitizedEmail = sanitizeInput(email);
        const sanitizedPassword = sanitizeInput(password);
        if (!validateEmail(sanitizedEmail)) {
            res.status(400).json({ error: 'Invalid email format' });
            return;
        }
        const passwordValidation = validatePassword(sanitizedPassword);
        if (!passwordValidation.valid) {
            res.status(400).json({ error: 'Password does not meet requirements', details: passwordValidation.errors });
            return;
        }
        const user = await UserService.createUser({
            email: sanitizedEmail,
            password: sanitizedPassword,
        });
        res.status(201).json(user);
    }
    catch (error) {
        if (error instanceof Error && error.message === 'Email already exists') {
            res.status(400).json({ error: 'Email already registered' });
            return;
        }
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.post('/login', loginLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ error: 'Email and password are required' });
            return;
        }
        const sanitizedEmail = sanitizeInput(email);
        const user = UserService.getUserByEmail(sanitizedEmail);
        if (!user) {
            res.status(401).json({ error: 'Invalid email or password' });
            return;
        }
        const isPasswordValid = await UserService.verifyPassword(user, password);
        if (!isPasswordValid) {
            res.status(401).json({ error: 'Invalid email or password' });
            return;
        }
        const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET || 'secret', {
            expiresIn: '24h',
            algorithm: 'HS256',
        });
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000,
        });
        res.status(200).json({
            user: UserService.toResponse(user),
            token,
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
export default router;
