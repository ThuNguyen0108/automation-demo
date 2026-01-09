/**
 * Session Management Types
 * 
 * Defines types and interfaces for session management:
 * - SessionType: Session types based on authentication logic and user roles
 * - SessionConfig: Configuration for a session
 * - StorageStateMetadata: Metadata for storageState file
 * - TwoFAOptions: Options for 2FA verification
 */

/**
 * Session types based on authentication logic and user roles
 * 
 * Mapping:
 * - trial → Role: TRIAL, Cookie: trialAuth, Path: /trial/*, /affiliate/*
 * - user → Role: USER, Cookie: userAuth
 * - admin → Role: ADMIN, Cookie: userAuth
 * - owner → Role: OWNER, Cookie: userAuth
 * - super-admin → Role: SUPER_ADMIN, Cookie: userAuth
 * 
 * Note: All non-trial roles use userAuth cookie, but session types are distinguished
 * by role for easier test data management and logging.
 */
export type SessionType = 'trial' | 'user' | 'admin' | 'owner' | 'super-admin';

/**
 * Configuration for a session
 * 
 * All fields are required:
 * - sessionType: Session type (trial, user, admin, owner, super-admin)
 * - email: Email address (used to generate session key: {sessionType}-{emailHash})
 * - password: Password (used for login)
 */
export interface SessionConfig {
  sessionType: SessionType;
  email: string;
  password: string;
}

/**
 * Metadata stored alongside storageState file
 * 
 * All fields are required:
 * - createdAt: Session creation time (ISO string)
 * - expiresAt: Session expiry time (ISO string, hardcoded: 7 days)
 *   - Heuristic check only: Actual session expiry is handled by backend/frontend
 *   - Automation uses this to avoid loading stale files
 * - sessionType: Session type
 * - email: Email address (for reference)
 * 
 * Note: Metadata is automatically generated when saving storageState (no manual creation needed)
 */
export interface StorageStateMetadata {
  createdAt: string; // ISO string
  expiresAt: string; // ISO string (7 days from createdAt)
  sessionType: SessionType;
  email: string;
}

/**
 * Options for 2FA verification flow
 * 
 * All fields are optional with auto-detect logic:
 * - strategy: Strategy to handle 2FA ('auto' or 'manual')
 *   - 'auto': Fill 2FA code automatically (requires 'code')
 *   - 'manual': Wait for user to manually enter code
 *   - Auto-detect logic (when strategy not specified):
 *     - If 'code' provided → use 'auto' strategy
 *     - If 'code' not provided → use 'manual' strategy
 * - code: 2FA code (6 digits)
 *   - Required if strategy === 'auto'
 *   - If strategy not specified and code provided → auto-detect to 'auto'
 * - timeout: Timeout for manual entry (milliseconds, default: 5 minutes = 300000)
 *   - Only applies when strategy === 'manual' or auto-detect to 'manual'
 */
export interface TwoFAOptions {
  strategy?: 'auto' | 'manual';
  code?: string; // 6 digits
  timeout?: number; // milliseconds, default: 300000 (5 minutes)
}

