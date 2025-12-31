import { CoreSupportUtil } from '@utils';
import { ISupportUtil } from './supportUtil.interface';
import { Page } from 'playwright-core';
import { PlaywrightInstance } from '@core';

export class SupportUtil extends CoreSupportUtil implements ISupportUtil {

    private get _page(): Page {
        return PlaywrightInstance.getInterface() as unknown as Page;
    }

}
