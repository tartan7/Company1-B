import bcrypt from 'bcrypt';
const users = new Map();
const emailIndex = new Map();
export class UserService {
    static generateId() {
        return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    static clearForTesting() {
        users.clear();
        emailIndex.clear();
    }
    static async createUser(input) {
        if (emailIndex.has(input.email.toLowerCase())) {
            throw new Error('Email already exists');
        }
        const passwordHash = await bcrypt.hash(input.password, 10);
        const user = {
            id: this.generateId(),
            email: input.email,
            passwordHash,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        users.set(user.id, user);
        emailIndex.set(input.email.toLowerCase(), user.id);
        return {
            id: user.id,
            email: user.email,
            createdAt: user.createdAt,
        };
    }
    static getUserById(id) {
        return users.get(id) || null;
    }
    static getUserByEmail(email) {
        const userId = emailIndex.get(email.toLowerCase());
        if (!userId)
            return null;
        return users.get(userId) || null;
    }
    static async verifyPassword(user, password) {
        return bcrypt.compare(password, user.passwordHash);
    }
    static toResponse(user) {
        return {
            id: user.id,
            email: user.email,
            createdAt: user.createdAt,
        };
    }
}
