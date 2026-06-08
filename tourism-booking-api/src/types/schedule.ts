export type Schedule = {
  id: string;
  activityId: string;
  startDate: string; // ISO 8601 date format YYYY-MM-DD (local timezone)
  endDate: string; // ISO 8601 date format YYYY-MM-DD (local timezone)
  startTime: string; // HH:mm format (local timezone)
  endTime: string; // HH:mm format (local timezone)
  timezone: string; // IANA timezone identifier (e.g., "America/New_York")
  startTimeUTC: string; // HH:mm format in UTC
  endTimeUTC: string; // HH:mm format in UTC
  totalSlots: number;
  bookedSlots: number;
  availableCount: number;
  isFull: boolean;
  operatorId: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateScheduleInput = {
  activityId: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  timezone?: string; // Defaults to 'UTC' if not provided for backward compatibility
  totalSlots: number;
};

export type UpdateScheduleInput = Partial<Omit<CreateScheduleInput, 'activityId'>>;
