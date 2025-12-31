import { Cookie } from '@playwright/test';
import { PlaywrightInstance } from '@core';
import { IBrowserUtil } from './browserUtil.interface';
import { Page } from 'playwright-core';

export class BrowserUtil implements IBrowserUtil {
    private get _page(): Page {
        return PlaywrightInstance.getInterface() as unknown as Page;
    }

    /**
     * If browserContext was launched as a persistent context, `browser()` will return null
     * @see {@link https://playwright.dev/docs/api/class-browsercontext#browser-context-browser}
     */
    getBrowserType(): string | null {
        return this._page.context().browser() !== null
            ? this._page.context().browser()!.browserType().name()
            : null;
    }

    executeJavaScript<GenericReturnType>(
        fn: string | (() => Promise<GenericReturnType>),
    ): Promise<GenericReturnType> {
        return this._page.evaluate(fn);
    }

    /**
     * If no URLs are specified, this method returns all cookies. If URLs are specified, only cookies
     * that affect those URLs are returned.
     * @param urls Optional URL / list of URLs
     */
    getCookies(
        urls?: string | readonly string[] | undefined,
    ): Promise<Cookie[]> {
        return this._page.context().cookies(urls);
    }

    /**
     * Adds cookies into this browser context. All pages within this context will have these cookies installed.
     * @param cookies
     */
    addCookies(
        cookies: readonly {
            name: string;
            value: string;
            url?: string;
            domain?: string;
            path?: string;
            expires?: number;
            httpOnly?: boolean;
            secure?: boolean;
            sameSite?: 'Strict' | 'Lax' | 'None';
        }[],
    ): Promise<void> {
        return this._page.context().addCookies(cookies);
    }

    /**
     * Removes cookies from context. Accepts optional filter.
     */
    clearCookies(
        filter?:
            | {
            domain?: string | RegExp;
            name?: string | RegExp;
            path?: string | RegExp;
        }
            | undefined,
    ): Promise<void> {
        return this._page.context().clearCookies(filter);
    }

    /**
     * By Playwright design, dialogs are auto-dismissed to prevent stall
     * (See more: {@link https://playwright.dev/docs/dialogs#alert-confirm-prompt})
     *
     * To be able to send text to prompt, pass the action that is going to show the prompt
     * as a function via `showPromptAction`
     *
     * @param text
     * @param showPromptAction action/sequence of action that lead to display the prompt,
     * wrapped in an async function
     */
    sendTextToPrompt<GenericReturnType>(
        text: string,
        showPromptAction: () => Promise<GenericReturnType>,
    ): Promise<GenericReturnType> {
        this._page.on('dialog', (dialog): void => {
            dialog.accept(text);
        });

        return showPromptAction();
    }
}
