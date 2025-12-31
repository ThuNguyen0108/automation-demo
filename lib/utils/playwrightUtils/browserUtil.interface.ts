import { Cookie } from '@playwright/test';

export interface IBrowserUtil {
    getBrowserType(): string | null;

    executeJavaScript<GenericReturnType>(
        fn: string | (() => Promise<GenericReturnType>),
    ): Promise<GenericReturnType>;

    getCookies(
        urls?: string | readonly string[] | undefined,
    ): Promise<Cookie[]>;

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
    ): Promise<void>;

    clearCookies(
        filter?:
            |   {
                     domain?: string | RegExp;
                     name?: string | RegExp;
                     path?: string | RegExp;
                }
            | undefined,
    ): Promise<void>;

    sendTextToPrompt<GenericReturnType>(
        text: string,
        showPromptAction: () => Promise<GenericReturnType>,
    ): Promise<GenericReturnType>;
}
