import FormData from 'form-data';
import * as fs from 'fs';
import { CoreLibrary, CoreMaps } from '@core';
import { ICoreAPIUtil } from './apiUtil.interface';
import { IConfluenceUtil } from './confluenceUtil.interface';
import { IFileUtil } from './fileUtil.interface';
import { ILogUtil } from './logUtil.interface';

export class ConfluenceUtil implements IConfluenceUtil {

    private get log(): ILogUtil {
        return CoreLibrary.log;
    }

    private get files(): IFileUtil {
        return CoreLibrary.files;
    }

    private get api(): ICoreAPIUtil {
        return CoreLibrary.api;
    }

    private get paths(): any {
        return CoreLibrary.paths;
    }

    public async createNewPage(
        spaceKey: string,
        newPageTitle: string,
        pageBody?: string,
    ): Promise<any> {
        const url = `${CoreMaps._env.get('confluence_endpoint')}/content`;
        const payload = {
            title: newPageTitle,
            type: 'page',
            space: {
                key: `${spaceKey}`,
            },
            body: {
                storage: {
                    value: pageBody || '',
                    representation: 'storage',
                },
            },
        };

        return await this.validResponse(url, payload);
    }

    public async createChildPage(
        spaceKey: string,
        parentPageId: string,
        newPageTitle: string,
        pageBody?: string,
    ): Promise<any> {
        const url = `${CoreMaps._env.get('confluence_endpoint')}/content`;
        const payload = {
            title: newPageTitle,
            type: 'page',
            space: {
                key: `${spaceKey}`,
            },
            ancestors: [
                {
                    id: parentPageId,
                },
            ],
            body: {
                storage: {
                    value: pageBody || '',
                    representation: 'storage',
                },
            },
        };

        return await this.validResponse(url, payload);
    }

    public async createAttachment(
        pageId: string,
        filePath: string,
    ): Promise<any> {
        const url = `${CoreMaps._env.get('confluence_endpoint')}/content/${pageId}/child/attachment`;

        try {
            const fileToUpload: string = fs.readFileSync(
                this.paths.sanitizePath(filePath),
                { encoding: 'utf-8' },
            );

            const fileName: string = await this.files.getFileNameFromPath(filePath);
            const form = new FormData();
            form.append('file', fileToUpload, fileName);

            const response: any = await this.api.returnPost(
                url,
                {
                    url: url,
                    headers: {
                        ...form.getHeaders(),
                        ...this.getHeaders(),
                    },
                },
                form,
            );

            if (response.status === 200) {
                await this.log.pass(
                    `Success: Attachment added with id [${response.data.results[0].id}]`,
                );
                return response.data.results;
            } else {
                await this.log.fail(response.data.message);
            }
        } catch (err: any) {
            throw new Error(err.stack !== undefined ? err.stack : err.message);
        }
    }

    public async getPageDetails(
        spaceKey: string,
        pageTitle: string,
    ): Promise<any> {
        const url = `${CoreMaps._env.get('confluence_endpoint')}/content?spaceKey=${spaceKey}&title=${pageTitle}&expand=space,version,container`;

        const response: any = await this.api.returnGet(url, {
            url: url,
            headers: this.getHeaders(),
        });

        if (response.status === 200) {
            await this.log.pass(
                `Status:${response.status}, Details retrieved successfully!`,
            );
            return {
                id: await response.data.results[0].id,
                version: response.data.results[0].version.number,
            };
        } else {
            await this.log.fail(response.data.message);
        }
    }

    public async updatePageContent(
        pageId: string,
        pageTitle: string,
        pageVersion: number,
        pageBody: string,
    ): Promise<void> {
        const url = `${CoreMaps._env.get('confluence_endpoint')}/content/${pageId}`;
        const payload = {
            version: {
                number: pageVersion + 1,
            },
            title: pageTitle,
            type: 'page',
            status: 'current',
            body: {
                storage: {
                    value: pageBody,
                    representation: 'storage',
                },
            },
        };

        const response: any = await this.api.returnPut(
            url,
            { url: url, headers: this.getHeaders() },
            payload,
        );

        if (response.status === 200) {
            await this.log.pass('Success: Page has been updated!');
        } else {
            await this.log.fail(response.data.message);
        }
    }

    public async getHTMLBody(filePath: string): Promise<string> {
        const body: string | null = await this.files.getFileContent(filePath);
        if (body === null)
            throw new Error(`no html body content found at ${filePath}`);
        return body;
    }

    private getHeaders(): { Authorization: string; Connection: string; 'X-Atlassian-Token': string } {
        const headers = {
            Authorization: `Bearer ${CoreMaps._env.get('confluence_token')}`,
            Connection: 'keep-alive',
            'X-Atlassian-Token': 'no-check',
        };
        return headers;
    }

    private async validResponse(url: string, payload: {}): Promise<any | null> {
        const response: any = await this.api.returnPost(
            url,
            { url: url, headers: this.getHeaders() },
            payload,
        );

        if (response.status === 200) {
            await this.log.pass(
                `Success: Page created with id [${response.data.id}]`,
            );
            return response.data.id;
        } else {
            await this.log.fail(response.data.message);
        }
    }
}
