export interface CommandMetadata {
  commandId: string;
  createdAt: Date;
  userId: bigint;
  userRole: string;
  resourceType: 'activity' | 'schedule' | 'booking';
  resourceId: bigint;
}

export interface CommandResult<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export abstract class Command<T = any> {
  abstract metadata: CommandMetadata;
  abstract execute(): Promise<CommandResult<T>>;
}

export class PublishCommand extends Command<{ version: number; resourceId: bigint }> {
  metadata: CommandMetadata;

  constructor(
    resourceType: 'activity' | 'schedule' | 'booking',
    resourceId: bigint,
    userId: bigint,
    userRole: string
  ) {
    super();
    this.metadata = {
      commandId: `publish-${resourceType}-${resourceId}-${Date.now()}`,
      createdAt: new Date(),
      userId,
      userRole,
      resourceType,
      resourceId,
    };
  }

  async execute(): Promise<CommandResult<{ version: number; resourceId: bigint }>> {
    // Implementation will be done by the handler
    throw new Error('Command must be executed via handler');
  }
}

export class RestoreCommand extends Command<{ newResourceId: bigint }> {
  metadata: CommandMetadata;
  version: number;

  constructor(
    resourceType: 'activity' | 'schedule' | 'booking',
    resourceId: bigint,
    version: number,
    userId: bigint,
    userRole: string
  ) {
    super();
    this.metadata = {
      commandId: `restore-${resourceType}-${resourceId}-v${version}-${Date.now()}`,
      createdAt: new Date(),
      userId,
      userRole,
      resourceType,
      resourceId,
    };
    this.version = version;
  }

  async execute(): Promise<CommandResult<{ newResourceId: bigint }>> {
    throw new Error('Command must be executed via handler');
  }
}

export class DeleteVersionCommand extends Command<{ version: number }> {
  metadata: CommandMetadata;
  version: number;

  constructor(
    resourceType: 'activity' | 'schedule' | 'booking',
    resourceId: bigint,
    version: number,
    userId: bigint,
    userRole: string
  ) {
    super();
    this.metadata = {
      commandId: `delete-version-${resourceType}-${resourceId}-v${version}-${Date.now()}`,
      createdAt: new Date(),
      userId,
      userRole,
      resourceType,
      resourceId,
    };
    this.version = version;
  }

  async execute(): Promise<CommandResult<{ version: number }>> {
    throw new Error('Command must be executed via handler');
  }
}
