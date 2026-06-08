export type User = {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateUserInput = {
  email: string;
  password: string;
};

export type UserResponse = {
  id: string;
  email: string;
  createdAt: Date;
};
