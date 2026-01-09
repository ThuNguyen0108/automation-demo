import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as lockfile from 'proper-lockfile';
import { CoreLibrary } from '@core';
import { IPlaywrightLibrary } from '@core/playwrightLibrary.interface';
import type {
  SessionType,
  SessionConfig,
  StorageStateMetadata,
} from './types';

export class SessionManager {

  private static getSessionKey(config: SessionConfig): string {
    const emailHash = crypto
      .createHash('md5')
      .update(config.email.toLowerCase().trim())
      .digest('hex')
      .substring(0, 8);
    return `${config.sessionType}-${emailHash}`;
  }


  private static getStorageStatePath(sessionKey: string): string {
    return path.join(
      CoreLibrary.paths.storageStates,
      `${sessionKey}.json`
    );
  }

  private static getMetadataPath(sessionKey: string): string {
    return path.join(
      CoreLibrary.paths.storageStates,
      `${sessionKey}.meta.json`
    );
  }

 
  static isStorageStateValid(config: SessionConfig): boolean {
    try {
      const sessionKey = this.getSessionKey(config);
      const storageStatePath = this.getStorageStatePath(sessionKey);
      const metadataPath = this.getMetadataPath(sessionKey);

      // Step 1: Check files exist
      if (!CoreLibrary.files.exists(storageStatePath) ||
          !CoreLibrary.files.exists(metadataPath)) {
        return false;
      }

      // Step 2: Read and parse metadata
      const metadataContent = CoreLibrary.files.getFileContent(metadataPath);
      if (!metadataContent) {
        CoreLibrary.log.warning(
          `Metadata file is empty: ${metadataPath}`
        );
        return false;
      }

      let metadata: StorageStateMetadata;
      try {
        metadata = JSON.parse(metadataContent);
      } catch (error: any) {
        CoreLibrary.log.warning(
          `Failed to parse metadata file: ${metadataPath}. ${error.message}`
        );
        return false; // Skip cleanup for corrupt files
      }

      // Step 3: Check expiry
      const expiresAt = new Date(metadata.expiresAt);
      const now = new Date();

      if (expiresAt < now) {
        // Session expired - cleanup on-demand (fire-and-forget, non-blocking)
        this.cleanupSessionFiles(sessionKey).catch(() => {
          // Ignore errors (non-critical, cleanup failure doesn't affect validation)
        });
        CoreLibrary.log.debug(`Session expired and cleaned up: ${sessionKey}`);
        return false;
      }

      return true;
    } catch (error: any) {
      // Enhance logging to avoid confusing messages for expected cases (e.g. first run)
      const message: string = String(error?.message || '');

      // Case 1: Raw ENOENT from fs (error.code preserved)
      if (error?.code === 'ENOENT') {
        CoreLibrary.log.debug(
          `StorageState not found for sessionType=${config.sessionType}, email=${config.email}. ` +
          `This is expected on first run or when session files were cleaned up.`
        );
        return false;
      }

      // Case 2: Wrapped ENOENT from FileUtil.getFileContent()
      // FileUtil wraps the original error into a new Error without code, but message contains 'getFileContent() error' + ENOENT
      if (
        message.includes('getFileContent() error') &&
        message.includes('ENOENT')
      ) {
        CoreLibrary.log.debug(
          `StorageState metadata not found for sessionType=${config.sessionType}, email=${config.email}. ` +
          `This is expected on first run for this session key.`
        );
        return false;
      }

      // Case 3: Real unexpected errors
      CoreLibrary.log.warning(
        `Unexpected error while checking storageState validity for ` +
        `sessionType=${config.sessionType}, email=${config.email}: ${message}`
      );
      return false;
    }
  }

  /**
   * Load storageState file path if valid
   * 
   * @param config Session configuration
   * @returns Absolute path to storageState file if valid, null otherwise
   */
  static loadStorageState(config: SessionConfig): string | null {
    if (!this.isStorageStateValid(config)) {
      return null;
    }

    const sessionKey = this.getSessionKey(config);
    const storageStatePath = this.getStorageStatePath(sessionKey);
    
    // Return absolute path
    return path.isAbsolute(storageStatePath)
      ? storageStatePath
      : path.resolve(storageStatePath);
  }

  /**
   * Save storageState file with metadata (atomic write + file locking)
   * 
   * Implementation:
   * 1. Acquire file lock (with retry)
   * 2. Write to temp files (.tmp)
   * 3. Atomic rename (temp → final)
   * 4. Release lock
   * 
   * @param config Session configuration
   * @param storageState Playwright storageState object
   */
  static async saveStorageState(
    config: SessionConfig,
    storageState: any
  ): Promise<void> {
    const sessionKey = this.getSessionKey(config);
    const storageStatePath = this.getStorageStatePath(sessionKey);
    const metadataPath = this.getMetadataPath(sessionKey);
    // Use the storageStates directory itself as the lock target.
    // proper-lockfile will manage the underlying .lock file.
    const lockTarget = CoreLibrary.paths.storageStates;

    let release: (() => Promise<void>) | null = null;

    try {
      // Ensure storageStates directory exists before locking/writing
      if (!CoreLibrary.files.exists(CoreLibrary.paths.storageStates)) {
        CoreLibrary.files.createDirectory(CoreLibrary.paths.storageStates);
      }

      // Step 1: Acquire lock on storageStates directory (with retry)
      release = await lockfile.lock(lockTarget, {
        retries: {
          retries: 5,
          minTimeout: 100,
          maxTimeout: 1000,
        },
      });

      // Step 2: Atomic write - Write to temp files first
      const tempStorageStatePath = `${storageStatePath}.tmp`;
      const tempMetadataPath = `${metadataPath}.tmp`;

      // Write storageState to temp file
      await CoreLibrary.files.JSONToFile(tempStorageStatePath, storageState);

      // Write metadata to temp file
      const metadata: StorageStateMetadata = {
        createdAt: new Date().toISOString(),
        // Hardcoded 7 days expiry (heuristic check to avoid loading stale files)
        // Note: Actual session expiry is handled by backend/frontend, not automation
        // This expiry is just an optimization - if backend session expired, it will be detected when loading storageState
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        sessionType: config.sessionType,
        email: config.email,
      };
      await CoreLibrary.files.JSONToFile(tempMetadataPath, metadata);

      // Step 3: Atomic rename (atomic operation on most filesystems)
      await fs.promises.rename(tempStorageStatePath, storageStatePath);
      await fs.promises.rename(tempMetadataPath, metadataPath);

      CoreLibrary.log.debug(`StorageState saved: ${storageStatePath}`);
    } catch (error: any) {
      CoreLibrary.log.err(
        `Failed to save storageState: ${storageStatePath}. ${error.message}`
      );
      throw error;
    } finally {
      // Step 4: Release lock
      if (release) {
        await release().catch(() => {
          // Ignore errors if lock already released
        });
      }
    }
  }

  /**
   * Extract session config from test data (YAML/CSV)
   * 
   * Assumes test data has been loaded via qe.data.setTestData(testName)
   * 
   * Required fields:
   * - email
   * - password
   * - sessionType
   * 
   * @param qe Playwright library instance
   * @returns SessionConfig
   * @throws Error if required fields missing
   */
  static async getSessionConfigFromTestData(
    qe: IPlaywrightLibrary
  ): Promise<SessionConfig> {
    const email = await qe.data.get('email');
    const password = await qe.data.get('password');
    const sessionType = await qe.data.get('sessionType');

    if (!email || !password || !sessionType) {
      throw new Error(
        `Session config missing required fields in test data. ` +
        `Required: email, password, sessionType. ` +
        `Found: email=${email ? '✓' : '✗'}, password=${password ? '✓' : '✗'}, sessionType=${sessionType ? '✓' : '✗'}`
      );
    }

    // Validate sessionType
    const validSessionTypes: SessionType[] = [
      'trial',
      'user',
      'admin',
      'owner',
      'super-admin',
    ];
    if (!validSessionTypes.includes(sessionType as SessionType)) {
      throw new Error(
        `Invalid sessionType in test data: ${sessionType}. ` +
        `Valid types: ${validSessionTypes.join(', ')}`
      );
    }

    return {
      sessionType: sessionType as SessionType,
      email: email.trim(),
      password: password.trim(),
    };
  }

  /**
   * Get session config from environment variables (with fallback)
   * 
   * Fallback strategy:
   * 1. Try session-specific env vars: SPEEDYDD_{SESSION_TYPE}_EMAIL, SPEEDYDD_{SESSION_TYPE}_PASSWORD
   * 2. Fallback to generic env vars: SPEEDYDD_DEV_EMAIL, SPEEDYDD_DEV_PASSWORD
   * 3. Throw error if neither found
   * 
   * @param sessionType Session type
   * @returns SessionConfig
   * @throws Error if env vars not found
   */
  static getSessionConfigFromEnv(sessionType: SessionType): SessionConfig {
    const sessionTypeUpper = sessionType.toUpperCase().replace('-', '_');
    
    // Step 1: Try session-specific env vars
    let email = process.env[`SPEEDYDD_${sessionTypeUpper}_EMAIL`];
    let password = process.env[`SPEEDYDD_${sessionTypeUpper}_PASSWORD`];

    // Step 2: Fallback to generic env vars
    if (!email) {
      email = process.env.SPEEDYDD_DEV_EMAIL;
    }
    if (!password) {
      password = process.env.SPEEDYDD_DEV_PASSWORD;
    }

    // Step 3: Error if both missing
    if (!email || !password) {
      throw new Error(
        `Session config not found in environment variables. ` +
        `Tried: SPEEDYDD_${sessionTypeUpper}_EMAIL, SPEEDYDD_${sessionTypeUpper}_PASSWORD, ` +
        `SPEEDYDD_DEV_EMAIL, SPEEDYDD_DEV_PASSWORD. ` +
        `Found: email=${email ? '✓' : '✗'}, password=${password ? '✓' : '✗'}`
      );
    }

    return {
      sessionType,
      email: email.trim(),
      password: password.trim(),
    };
  }

  /**
   * Helper method: Get session config with fallback (test data → env vars → error)
   * 
   * Priority:
   * 1. Test Data YAML/CSV (via getSessionConfigFromTestData)
   * 2. Environment Variables (via getSessionConfigFromEnv)
   * 3. Error (if both missing)
   * 
   * @param qe Playwright library instance
   * @param sessionType Session type (used for env fallback)
   * @returns SessionConfig
   * @throws Error if both test data and env vars missing
   */
  static async getSessionConfig(
    qe: IPlaywrightLibrary,
    sessionType: SessionType
  ): Promise<SessionConfig> {
    // Try test data first
    try {
      const config = await this.getSessionConfigFromTestData(qe);
      if (config && config.email && config.password) {
        return config;
      }
    } catch (error) {
      // Test data not available, fallback to env
      CoreLibrary.log.debug(
        `Test data not available, falling back to environment variables: ${error}`
      );
    }

    // Fallback to environment variables
    try {
      return this.getSessionConfigFromEnv(sessionType);
    } catch (error) {
      throw new Error(
        `Session config not found. ` +
        `Provide test data (YAML/CSV) or set environment variables: ` +
        `SPEEDYDD_${sessionType.toUpperCase().replace('-', '_')}_EMAIL or SPEEDYDD_DEV_EMAIL`
      );
    }
  }

  /**
   * Map role string to SessionType
   * 
   * @param role Role string (e.g., 'ADMIN', 'TRIAL', 'USER')
   * @returns SessionType
   */
  static getSessionTypeFromRole(role: string): SessionType {
    switch (role.toUpperCase()) {
      case 'TRIAL':
        return 'trial';
      case 'USER':
        return 'user';
      case 'ADMIN':
        return 'admin';
      case 'OWNER':
        return 'owner';
      case 'SUPER_ADMIN':
        return 'super-admin';
      default:
        return 'user'; // Default fallback
    }
  }

  /**
   * Private helper: Cleanup specific session files (idempotent, handles race conditions)
   * 
   * Called automatically when session expires (on-demand cleanup)
   * 
   * @param sessionKey Session key
   */
  private static async cleanupSessionFiles(sessionKey: string): Promise<void> {
    const storageStateFile = this.getStorageStatePath(sessionKey);
    const metadataFile = this.getMetadataPath(sessionKey);

    // Check before delete (atomic check to handle race conditions)
    const storageStateExists = CoreLibrary.files.exists(storageStateFile);
    const metadataExists = CoreLibrary.files.exists(metadataFile);

    if (!storageStateExists && !metadataExists) {
      // Already cleaned up by another worker (race condition handled)
      return;
    }

    try {
      // Delete storageState file (idempotent)
      if (storageStateExists) {
        await CoreLibrary.files.deleteFile(storageStateFile);
      }

      // Delete metadata file (idempotent)
      if (metadataExists) {
        await CoreLibrary.files.deleteFile(metadataFile);
      }

      CoreLibrary.log.debug(`Cleaned up expired session: ${sessionKey}`);
    } catch (error: any) {
      // Ignore "file not found" errors (idempotent - file may have been deleted by another worker)
      if (
        !error.message?.includes('not found') &&
        !error.message?.includes('ENOENT')
      ) {
        CoreLibrary.log.warning(
          `Failed to cleanup expired session files: ${sessionKey}. ${error.message}`
        );
      }
      // Silently ignore if file already deleted (race condition handled)
    }
  }
}

