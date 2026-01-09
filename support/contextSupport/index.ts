/**
 * Context Support Module - Entry Point
 * 
 * Exports all types and classes for session management:
 * - SessionManager: Core session management class (static methods)
 * - StorageStateUpdater: Refresh token monitoring class (static methods)
 * - Types: SessionType, SessionConfig, StorageStateMetadata, TwoFAOptions
 */

export { SessionManager } from './SessionManager';
export { StorageStateUpdater } from './StorageStateUpdater';
export type {
  SessionType,
  SessionConfig,
  StorageStateMetadata,
  TwoFAOptions,
} from './types';

