import { PublishCommand, RestoreCommand, DeleteVersionCommand, CommandResult } from './publishCommand';
import { SnapshotService } from '../services/snapshotService';
import { AuditService } from '../services/auditService';

export class SnapshotCommandHandler {
  async handle(command: PublishCommand): Promise<CommandResult<{ version: number; resourceId: bigint }>> {
    try {
      const result = await SnapshotService.publishEntity(
        command.metadata.resourceType,
        command.metadata.resourceId,
        command.metadata.userId
      );

      if (!result.success) {
        return {
          success: false,
          message: result.message,
          error: result.error || 'PUBLISH_FAILED',
        };
      }

      return {
        success: true,
        message: result.message,
        data: {
          version: result.version || 0,
          resourceId: result.resourceId || command.metadata.resourceId,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: 'Failed to execute publish command',
        error: errorMessage,
      };
    }
  }

  async handleRestore(command: RestoreCommand): Promise<CommandResult<{ newResourceId: bigint }>> {
    try {
      const result = await SnapshotService.restoreVersion(
        command.metadata.resourceType,
        command.metadata.resourceId,
        command.version,
        command.metadata.userId
      );

      if (!result.success) {
        return {
          success: false,
          message: result.message,
          error: result.error || 'RESTORE_FAILED',
        };
      }

      return {
        success: true,
        message: result.message,
        data: {
          newResourceId: result.newDraftId || BigInt(0),
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: 'Failed to execute restore command',
        error: errorMessage,
      };
    }
  }

  async handleDeleteVersion(command: DeleteVersionCommand): Promise<CommandResult<{ version: number }>> {
    try {
      const result = await SnapshotService.softDeleteVersion(
        command.metadata.resourceType,
        command.metadata.resourceId,
        command.version,
        command.metadata.userId
      );

      if (!result.success) {
        return {
          success: false,
          message: result.message,
          error: result.error || 'DELETE_FAILED',
        };
      }

      return {
        success: true,
        message: result.message,
        data: {
          version: result.version || command.version,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: 'Failed to execute delete command',
        error: errorMessage,
      };
    }
  }
}

export const snapshotCommandHandler = new SnapshotCommandHandler();
