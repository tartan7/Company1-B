import jwt from 'jsonwebtoken';
export const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        res.status(401).json({ error: 'Missing authorization token' });
        return;
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        req.userId = decoded.userId;
        req.role = decoded.role;
        next();
    }
    catch {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
};
export const requireOperator = (req, res, next) => {
    if (req.role !== 'operator') {
        res.status(403).json({ error: 'Only operators can perform this action' });
        return;
    }
    next();
};
