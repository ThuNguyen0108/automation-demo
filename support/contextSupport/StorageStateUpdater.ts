/**
 * StorageStateUpdater - Monitor refresh token calls and auto-update storageState
 * 
 * Handles:
 * - Monitoring refresh token API calls
 * - Detecting cookie updates
 * - Queueing concurrent refresh token calls (sequential processing)
 * - Auto-updating storageState after refresh token
 * 
 * All methods are static (no need to instantiate).
 */

import { Page } from '@playwright/test';
import { CoreLibrary } from '@core';
import { SessionManager } from './SessionManager';
import type { SessionConfig } from './types';

export class StorageStateUpdater {
  /**
   * Monitor refresh token calls and auto-update storageState
   * 
   * How it works:
   * 1. Attach listeners to page.on('request') and page.on('response')
   * 2. Detect refresh token requests (/auth/refresh or /refresh-token POST)
   * 3. Track request ID (URL) and timestamp
   * 4. Wait for response with status 200
   * 5. Wait for cookie update (polling with 5s timeout)
   * 6. Queue update (sequential processing to avoid race conditions)
   * 7. Save storageState via SessionManager.saveStorageState()
   * 8. Return cleanup function to remove listeners
   * 
   * @param page Playwright page instance
   * @param sessionConfig Session configuration
   * @returns Cleanup function to remove listeners
   */
  static monitorAndUpdateOnRefresh(
    page: Page,
    sessionConfig: SessionConfig
  ): () => void {
    const updateQueue: Array<() => Promise<void>> = [];
    let isProcessingQueue = false;
    const pendingRefreshTokens = new Set<string>(); // Track pending updates

    // Determine cookie name based on session type
    const authCookieName =
      sessionConfig.sessionType === 'trial'
        ? 'trialAuthRefreshToken'
        : 'userAuthRefreshToken';

    /**
     * Process update queue sequentially
     */
    const processUpdateQueue = async (): Promise<void> => {
      if (isProcessingQueue || updateQueue.length === 0) {
        return;
      }

      isProcessingQueue = true;
      while (updateQueue.length > 0) {
        const task = updateQueue.shift();
        if (task) {
          try {
            await task();
          } catch (error: any) {
            CoreLibrary.log.warning(
              `Error processing refresh token queue: ${error.message}. Continuing...`
            );
          }
        }
      }
      isProcessingQueue = false;
    };

    /**
     * Request listener: Detect refresh token requests
     */
    const requestListener = async (request: any) => {
      const url = request.url();
      const isRefreshTokenRequest =
        (url.includes('/auth/refresh') || url.includes('/refresh-token')) &&
        request.method() === 'POST';

      if (isRefreshTokenRequest) {
        const requestId = url; // Use URL as unique ID
        const timestamp = Date.now();
        // Store request info (not used currently, but available for debugging)
        CoreLibrary.log.debug(
          `Refresh token request detected: ${requestId} at ${timestamp}`
        );
      }
    };

    /**
     * Response listener: Handle refresh token responses
     */
    const responseListener = async (response: any) => {
      const url = response.url();
      const isRefreshTokenResponse =
        (url.includes('/auth/refresh') || url.includes('/refresh-token')) &&
        (await response.request().method()) === 'POST';

      if (!isRefreshTokenResponse) {
        return;
      }

      const requestId = url;
      const status = response.status();

      // Only process successful responses
      if (status >= 400) {
        CoreLibrary.log.warning(
          `Refresh token failed with status ${status}. StorageState will not be updated.`
        );
        pendingRefreshTokens.delete(requestId);
        return;
      }

      // Prevent duplicate processing
      if (pendingRefreshTokens.has(requestId)) {
        return;
      }

      pendingRefreshTokens.add(requestId);

      // Add update task to queue
      updateQueue.push(async () => {
        try {
          // Wait for cookie to be updated (polling with timeout)
          let cookieUpdated = false;
          const maxWaitMs = 5000; // 5 seconds timeout
          const pollIntervalMs = 100; // Poll every 100ms
          let waited = 0;

          while (!cookieUpdated && waited < maxWaitMs) {
            const cookies = await page.context().cookies();
            const refreshTokenCookie = cookies.find(
              (c) => c.name === authCookieName
            );

            // Check if cookie exists and has a value
            if (refreshTokenCookie && refreshTokenCookie.value) {
              // Wait a bit more to ensure cookie is fully set
              await page.waitForTimeout(200);
              cookieUpdated = true;
            } else {
              await page.waitForTimeout(pollIntervalMs);
              waited += pollIntervalMs;
            }
          }

          if (!cookieUpdated) {
            CoreLibrary.log.warning(
              `Refresh token cookie not updated within timeout (${maxWaitMs}ms), but proceeding with update`
            );
          }

          // Get updated storageState
          const updatedStorageState = await page.context().storageState();

          // Save via SessionManager (handles atomic writes + file locking)
          await SessionManager.saveStorageState(
            sessionConfig,
            updatedStorageState
          );

          CoreLibrary.log.debug(
            `✅ Successfully updated storageState after refresh token`
          );
        } catch (error: any) {
          CoreLibrary.log.err(
            `Failed to update storageState after refresh token: ${error.message}`
          );
          // Don't throw - let test continue, session will be re-created on next login
        } finally {
          // Remove from pending set
          pendingRefreshTokens.delete(requestId);
        }
      });

      // Process queue (sequential)
      processUpdateQueue().catch((error: any) => {
        CoreLibrary.log.warning(
          `Error processing refresh token queue: ${error.message}. Continuing...`
        );
      });
    };

    // Attach listeners
    try {
      page.on('request', requestListener);
      page.on('response', responseListener);
    } catch (error: any) {
      CoreLibrary.log.err(
        `Failed to attach refresh token listeners: ${error.message}`
      );
      throw error; // Critical - cannot monitor without listeners
    }

    // Return cleanup function
    return () => {
      try {
        page.off('request', requestListener);
        page.off('response', responseListener);
        CoreLibrary.log.debug('Refresh token listeners removed');
      } catch (error: any) {
        CoreLibrary.log.warning(
          `Error removing refresh token listeners: ${error.message}`
        );
      }
    };
  }
}

