export interface IConfluenceUtil {

    createAttachment: (pageId: string, filePath: string) => Promise<any>;

    createChildPage: (
        spaceKey: string,
        parentPageId: string,
        newPageTitle: string,
        pageBody?: string,
    ) => Promise<any>;

    createNewPage: (
        spaceKey: string,
        newPageTitle: string,
        pageBody?: string,
    ) => Promise<any>;

    getHTMLBody: (filePath: string) => Promise<string>;

    getPageDetails: (spaceKey: string, pageTitle: string) => Promise<any>;

    updatePageContent: (
        pageId: string,
        pageTitle: string,
        pageVersion: number,
        pageBody: string,
    ) => Promise<any>;
}
