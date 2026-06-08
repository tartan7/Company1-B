export class Command {
}
export class PublishCommand extends Command {
    constructor(resourceType, resourceId, userId, userRole) {
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
    async execute() {
        // Implementation will be done by the handler
        throw new Error('Command must be executed via handler');
    }
}
export class RestoreCommand extends Command {
    constructor(resourceType, resourceId, version, userId, userRole) {
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
    async execute() {
        throw new Error('Command must be executed via handler');
    }
}
export class DeleteVersionCommand extends Command {
    constructor(resourceType, resourceId, version, userId, userRole) {
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
    async execute() {
        throw new Error('Command must be executed via handler');
    }
}
