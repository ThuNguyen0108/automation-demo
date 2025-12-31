import { Locator } from '@playwright/test';

export interface IUIUtil {
    getText: (selector: string | Locator) => Promise<string>;

    click: (
        selector: string | Locator,
        options?: { force?: boolean },
    ) => Promise<void>;

    check: (
        selector: string | Locator,
        options?: { force?: boolean },
    ) => Promise<void>;

    unCheck: (
        selector: string | Locator,
        options?: { force?: boolean },
    ) => Promise<void>;

    fill: (
        label: string,
        value: string,
        options?: {
            force?: boolean;
            noWaitAfter?: boolean;
            timeout?: number;
        },
    ) => Promise<void>;

    clearText: (
        selector: string,
        options?: { force?: boolean },
    ) => Promise<void>;

    clickByText: (
        text: string | RegExp,
        options?: { exact?: boolean },
    ) => Promise<void>;

    selectDropDownMenuOfLabelByText: (
        label: string,
        value: string,
        options?: {
            force?: boolean;
        },
    ) => Promise<void>;

    selectDropDownMenuOfLabelById: (
        label: string,
        id: number,
        options?: {
            force?: boolean;
        },
    ) => Promise<void>;

    checkElementByLabel: (
        label: string,
        options?: { force?: boolean },
    ) => Promise<void>;

    unCheckElementByLabel: (
        label: string,
        options?: { force?: boolean },
    ) => Promise<void>;

    checkElementByLabelInGroup: (
        parentSelector: string,
        label: string,
        options?: {
            force?: boolean;
        },
    ) => Promise<void>;

    unCheckElementByLabelInGroup: (
        parentSelector: string,
        label: string,
        options?: {
            force?: boolean;
        },
    ) => Promise<void>;

    fillByLabel: (
        label: string,
        value: string,
        options?: {
            force?: boolean;
            noWaitAfter?: boolean;
            timeout?: number;
        },
    ) => Promise<void>;

    clearTextByLabel: (
        label: string,
        options?: { force?: boolean },
    ) => Promise<void>;

    // setPage: (page: Page) => void
}
