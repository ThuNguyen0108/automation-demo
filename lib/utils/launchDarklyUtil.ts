import { CoreLibrary, CoreMaps, ICoreProjectProps } from '@core';
import { ICoreAPIUtil } from './apiUtil.interface';
import { ILaunchDarklyUtil } from './launchDarklyUtil.interface';
import { ILogUtil } from './logUtil.interface';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { ICoreSupportUtil } from './supportUtil.interface';

const err1: string =
  'Launch Darkly implementation requires project.properties values for launchDarkly.projectKey';

const err2: string =
  'Launch Darkly implementation requires project.properties values for launchDarkly.apiKey';

const err3: string =
  'Launch Darkly implementation requires <process.env.TARGET>.properties values for launchDarkly.environmentKey';

let apiKey: string | undefined;
let projectKey: string;
let envKey: string;
let baseUrl: string = 'https://app.launchdarkly.com/api/v2/';
let headers: {};
let linuxAgentOptions: {};

export class LaunchDarklyUtil implements ILaunchDarklyUtil {
  private get log(): ILogUtil {
    return CoreLibrary.log;
  }

  private get props(): ICoreProjectProps {
    return CoreLibrary.projectProps;
  }

  private get api(): ICoreAPIUtil {
    return CoreLibrary.api;
  }

  private get support(): ICoreSupportUtil {
    return CoreLibrary.support;
  }

  /**
   * Initializes the utility with given parameters.
   */
  private async init(): Promise<void> {
    if (this.props.launchDarkly) {
      if (!this.props.launchDarkly.projectKey) throw new Error(err1);
      projectKey = this.props.launchDarkly.projectKey as string;

      apiKey =
        this.props.launchDarkly.apiKey ||
        process.env.LAUNCH_DARKLY_API_KEY;

      if (!apiKey) throw new Error(err2);

      if (!CoreMaps._env.has('launchDarkly.environmentKey'))
        throw new Error(err3);

      envKey = CoreMaps._env.get(
        'launchDarkly.environmentKey'
      ) as string;

      headers = {
        Authorization: apiKey,
        'Content-Type': 'application/json',
      };

      if (this.support.isLinux()) {
        const httpsProxyAgent = new HttpsProxyAgent(
          process.env.https_proxy!
        );

        linuxAgentOptions = {
          proxy: false,
          httpsAgent: httpsProxyAgent,
        };
      }
    }
  }

  /**
   * Delays execution by a given number of milliseconds.
   *
   * @param milliseconds - The number of milliseconds to delay.
   */
  private async delay(milliseconds: number): Promise<void> {
    return new Promise(
      (resolve: (value: void | PromiseLike<void>) => void) =>
        setTimeout(resolve, milliseconds)
    );
  }

  /**
   * Fetches the current data of the feature flag.
   *
   * @param flagName - the flag to get values
   */
  async getFlag(flagName: string): Promise<Response> {
    await this.init();

    const response: any = await this.api.returnGet(
      `${baseUrl}flags/${projectKey}/${flagName}`,
      {
        method: 'GET',
        headers: headers,
        ...linuxAgentOptions,
      }
    );

    await this.log.result(
      response.status === 200,
      `Response should always be 200${
        response.status !== 200 ? `: Response was ${response}` : ''
      }`
    );

    await this.log.result(
      response.data !== undefined &&
        response.data.environments !== undefined &&
        response.data.environments[envKey] !== undefined,
      `Response should contain data for flag[${flagName}] for environment[${envKey}]${
        response.status !== 200 ? `: Response was ${response}` : ''
      }`
    );

    return response.data.environments[envKey];
  }

  async getAllFlags(): Promise<Map<string, any>> {
    await this.init();

    const response: any = await this.api.returnGet(
      `${baseUrl}flags/${projectKey}`,
      {
        method: 'GET',
        headers: headers,
        ...linuxAgentOptions,
      }
    );

    await this.log.result(
      response.status === 200,
      `Response should always be 200${
        response.status !== 200 ? `: Response was ${response}` : ''
      }`
    );

    await this.log.result(
      response.data !== undefined &&
        response.data.items !== undefined &&
        response.data.items.length > 0,
      `Flag list should be > 0 and is ${response.data.items.length}`
    );

    let envFlags: Map<string, any> = new Map();

    for (let i: number = 0; i <= response.data.items.length - 1; i++) {
      envFlags.set(
        response.data.items[i].key,
        response.data.items[i].environments[envKey]
      );
    }

    return envFlags;
  }

  /**
   * Fetches the current state of the feature flag.
   *
   * @param flagName - the flag to get status
   * @returns {Promise<boolean>} The state of the feature flag (true if enabled, false otherwise).
   */
  async getFlagStatus(flagName: string): Promise<boolean> {
    await this.init();

    const response: any = await this.api.returnGet(
      `${baseUrl}flags/${projectKey}/${flagName}`,
      {
        method: 'GET',
        headers: headers,
        ...linuxAgentOptions,
      }
    );

    await this.log.result(
      response.status === 200,
      `Response should always be 200${
        response.status !== 200 ? `: Response was ${response}` : ''
      }`
    );

    await this.log.result(
      response.data !== undefined &&
        response.data.environments !== undefined &&
        response.data.environments[envKey] !== undefined,
      `Response should contain toggle status for ${flagName}${
        response.status !== 200 ? `: Response was ${response}` : ''
      }`
    );

    return response.data.environments[envKey].on;
  }

  /**
   * Sets the state of the feature flag.
   *
   * @param flagName - the flag to set
   * @param enabled - The desired state of the feature flag (true to enable, false to disable).
   */
  async setFlagStatus(
    flagName: string,
    enabled: boolean
  ): Promise<any> {
    await this.init();

    let response: any = {};

    if ((await this.getFlagStatus(flagName)) !== enabled) {
      response = await this.api.returnPatch(
        `${baseUrl}flags/${projectKey}/${flagName}`,
        {
          headers: headers,
          method: 'PATCH',
          ...linuxAgentOptions,
        },
        {
          patch: [
            {
              op: 'replace',
              path: `/environments/${envKey}/on`,
              value: enabled,
            },
          ],
        }
      );

      await this.log.result(
        response.status === 200,
        `Response should always be 200${
          response.status !== 200 ? `: Response was ${response}` : ''
        }`
      );

      await this.log.result(
        response.data !== undefined &&
          response.data.environments !== undefined &&
          response.data.environments[envKey] !== undefined,
        `Response should contain toggle status for ${flagName}${
          response.status !== 200 ? `: Response was ${response}` : ''
        }`
      );

      await this.log.result(
        response.data.environments[envKey].on === enabled,
        `Flag should be ${enabled} and is ${response.data.environments[envKey].on}`
      );
    }

    return response;
  }
}
