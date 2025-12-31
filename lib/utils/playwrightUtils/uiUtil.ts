import { Locator } from '@playwright/test';
import { PlaywrightInstance } from '@core';
import { IUIUtil } from './uiUtil.interface';
import { Page } from 'playwright-core';

export class UIUtil implements IUIUtil {
    constructor() {}

    private get _page(): Page {
        return PlaywrightInstance.getInterface() as unknown as Page;
    }

    private locate(selector: string | Locator): Locator {
        if (typeof selector !== 'string') return selector;
        return this._page.locator(selector);
    }

    private locateByText(
        text: string | RegExp,
        options?: { exact?: boolean }
    ): Locator {
        return this._page.getByText(text, options);
    }

    public async getText(selector: string | Locator): Promise<string> {
        let text: string | null = await this.locate(selector).textContent();
        return text ? text : '';
    }

    public async click(
        selector: string | Locator,
        options?: {
            force?: boolean;
        }
    ): Promise<void> {
        await this.locate(selector).click(options);
    }

    /**
     * Checks the checkbox of the supplied selector
     * @param selector
     * @param options
     */
    public async check(
        selector: string | Locator,
        options?: {
            force?: boolean;
        }
    ): Promise<void> {
        await this.locate(selector).check(options);
    }

    /**
     * Unchecks the checkbox of the supplied selector
     * @param selector
     * @param options
     */
    public async unCheck(
        selector: string | Locator,
        options?: {
            force?: boolean;
        }
    ): Promise<void> {
        await this.locate(selector).uncheck(options);
    }

    public async fill(
        selector: string,
        value: string,
        options?: {
            force?: boolean;
            noWaitAfter?: boolean;
            timeout?: number;
        }
    ): Promise<void> {
        await this._page.locator(selector).fill(value, options);
    }

    public async clearText(
        selector: string,
        options?: {
            force?: boolean;
        }
    ): Promise<void> {
        await this.locate(selector).clear(options);
    }

    public async clickByText(
        text: string | RegExp,
        options?: { exact?: boolean }
    ): Promise<void> {
        await this.locateByText(text, options).click();
    }

    // action by label
    public async selectDropDownMenuOfLabelByText(
        label: string,
        value: string,
        options?: {
            force?: boolean;
        }
    ): Promise<void> {
        await this.locateByText(label)
            .locator('+ * button')
            .click(options);

        await this._page.waitForTimeout(300);

        await this.locateByText(label)
            .locator('+ * ul')
            .getByText(value)
            .click(options);
    }

    public async selectDropDownMenuOfLabelById(
        label: string,
        id: number,
        options?: {
            force?: boolean;
        }
    ): Promise<void> {
        await this.locateByText(label)
            .locator('+ * button')
            .click(options);

        await this._page.waitForTimeout(300);

        await this.locateByText(label)
            .locator('+ * ul li')
            .nth(id)
            .click(options);
    }

    public async checkElementByLabel(
        label: string,
        options?: {
            force?: boolean;
        }
    ): Promise<void> {
        await this._page.getByLabel(label).check(options);
    }

    public async unCheckElementByLabel(
        label: string,
        options?: {
            force?: boolean;
        }
    ): Promise<void> {
        await this._page.getByLabel(label).uncheck(options);
    }

    public async checkElementByLabelInGroup(
        parentSelector: string,
        label: string,
        options?: {
            force?: boolean;
        }
    ): Promise<void> {
        await this.locate(`label:text("${parentSelector}")`)
            .locator('+ *')
            .getByLabel(label)
            .check(options);
    }

    public async unCheckElementByLabelInGroup(
        parentSelector: string,
        label: string,
        options?: {
            force?: boolean;
        }
    ): Promise<void> {
        await this.locate(`label:text("${parentSelector}")`)
            .locator('+ *')
            .getByLabel(label)
            .uncheck(options);
    }

    public async fillByLabel(
        label: string,
        value: string,
        options?: {
            force?: boolean;
            noWaitAfter?: boolean;
            timeout?: number;
        }
    ): Promise<void> {
        await this._page.getByLabel(label).fill(value, options);
    }

    public async clearTextByLabel(
        label: string,
        options?: {
            force?: boolean;
        }
    ): Promise<void> {
        await this._page.getByLabel(label).clear(options);
    }
}
