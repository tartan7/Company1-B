import bcrypt from 'bcrypt';
import { User, CreateUserInput, UserResponse } from '../types/user';

const users = new Map<string, User>();
const emailIndex = new Map<string, string>();

export class UserService {
  static generateId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static clearForTesting(): void {
    users.clear();
    emailIndex.clear();
  }

  static async createUser(input: CreateUserInput): Promise<UserResponse> {
    if (emailIndex.has(input.email.toLowerCase())) {
      throw new Error('Email already exists');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user: User = {
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

  static getUserById(id: string): User | null {
    return users.get(id) || null;
  }

  static getUserByEmail(email: string): User | null {
    const userId = emailIndex.get(email.toLowerCase());
    if (!userId) return null;
    return users.get(userId) || null;
  }

  static async verifyPassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.passwordHash);
  }

  static toResponse(user: User): UserResponse {
    return {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
    };
  }
}
