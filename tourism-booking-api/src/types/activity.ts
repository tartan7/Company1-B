export type ActivityImage = {
  originalUrl: string;
  optimizedUrl: string;
  thumbnail: string;
  s3Key: string;
};

export type Activity = {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  duration: number;
  location: string;
  operatorId: string;
  maxParticipants: number;
  images?: ActivityImage[];
  createdAt: Date;
  updatedAt: Date;
};

export type CreateActivityInput = {
  title: string;
  description: string;
  category: string;
  price: number;
  duration: number;
  location: string;
  maxParticipants: number;
};

export type UpdateActivityInput = Partial<CreateActivityInput>;
