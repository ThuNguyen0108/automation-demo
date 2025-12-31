import qTestHelper from 'qtest_integration';
import { CoreLibrary, ICoreProjectProps } from '@core';
import { ICoreAPIUtil } from './apiUtil.interface';
import { TStatus } from './logUtil';
import { ILogUtil } from './logUtil.interface';
import { IQTestUtil } from './qtestUtil.interface';

let qTestProjectUrl: string;
let qTestAPIUrl: string;
let qTestConfig: object = {};

export class QTestUtil implements IQTestUtil {
    private get log(): ILogUtil {
        return CoreLibrary.log;
    }

    private get props(): ICoreProjectProps {
        return CoreLibrary.projectProps;
    }

    private get process(): any {
        return CoreLibrary.process;
    }

    private get api(): ICoreAPIUtil {
        return CoreLibrary.api;
    }

    public hasProjectID(): boolean {
        return (
            this.props.qTest?.projectID !== undefined &&
            this.props.qTest?.projectID !== -1
        );
    }

    private async setProxy(): Promise<void> {
        if (this.hasProjectID()) {
            if (
                process.env.no_proxy !== undefined &&
                process.env.no_proxy.toString().includes('qtest.trs')
            ) {
                return;
            }

            if (process.env.no_proxy === undefined) {
                process.env.no_proxy = '';
            }

            await this.log.warning(
                'qtest.trs.ext.national.com.au was not found in your no_proxy variables, so it is added to no_proxy, NO_PROXY and GLOBAL_AGENT_NO_PROXY. Please consider adding it to your environment variables.',
            );

            process.env.no_proxy = process.env.no_proxy
                .toString()
                .concat(',qtest.trs.ext.national.com.au');

            process.env.NO_PROXY = process.env.no_proxy;
            process.env.GLOBAL_AGENT_NO_PROXY = process.env.no_proxy;
        }
    }

    public async setConfig(): Promise<void> {
        if (this.hasProjectID() && this.props.qTest) {
            if (this.props.qTest.projectID === undefined) {
                throw new Error(
                    'QTest projectID was not supplied, please add to this.project.properties or process.env as advised in the docs',
                );
            }

            try {
                await this.setProxy();

                qTestProjectUrl = 'https://qtest.trs.ext.national.com.au';
                qTestAPIUrl = `${qTestProjectUrl}/api/v3/projects/${this.props.qTest.projectID}/`;

                qTestConfig = {
                    headers: {
                        Authorization: this.props.qTest.token,
                    },
                };

                qTestHelper.setConfig({
                    projectUrl: qTestProjectUrl,
                    projectId: this.props.qTest.projectID.toString(),
                    auth:
                        this.props.qTest.token ||
                        process.env.QE_QTEST_TOKEN || '',
                });
            } catch (err: any) {
                throw new Error(
                    err.stack !== undefined ? err.stack : err.message,
                );
            }
        }
    }

    public async addTest(
        test: any,
        result: any,
        screenShotBase64?: string,
    ): Promise<void> {
        if (this.hasProjectID()) {
            const suiteID: string | undefined = this.props.qTest?.suiteID
                ? this.props.qTest.suiteID.toString()
                : undefined;

            if (suiteID === undefined) {
                await this.log.warning(
                    'QTest suiteID was not supplied, please add to this.project.properties or process.env as advised in the docs',
                );
            } else {
                const testID: number = await this.getTestID(test.title);

                if (testID !== undefined && testID !== -1) {
                    try {
                        const payload = {
                            description: test.title, // Test case name
                            testCasePid: testID.toString(), // Test case id, example 'TC-57'
                            status: (result.passed
                                ? 'PASSED'
                                : 'FAILED') as TStatus, // Valid value : PASSED | FAILED
                            startTime: new Date(), // Start time
                            error: result.error
                                ? result.error.toString()
                                : '', // Provide the error message if the status is FAILED [OPTIONAL]
                            testSuiteId: suiteID, // QTEST ID of a test suite
                            screenshot: screenShotBase64 || '', // Provide the base64 encoded string of screenshot [OPTIONAL]
                        };

                        if (result.error) {
                            await this.log.debug(
                                `result.error:${JSON.stringify(
                                    result.error.toString(),
                                )}`,
                            );
                        }

                        await this.log.debug(
                            `payload:${JSON.stringify(payload)}`,
                        );

                        // Assumes qTestHelper is initialised
                        await qTestHelper.executeTestRun(payload);
                    } catch (err: any) {
                        throw new Error(
                            err.stack !== undefined ? err.stack : err.message,
                        );
                    }
                } else {
                    await this.log.debug(
                        `No test id??? ${testID}`,
                    );
                }
            }
        }
    }

    private async createTest(
        testCaseName: string,
    ): Promise<number> {
        try {
            await this.log.warning(
                'QTest Test Case will be created under "Created via API" in Test Design. Please move to appropriate location in QTest for permanent storage',
            );

            const qTestTestCasesUri = `${qTestAPIUrl}test-cases`;

            const testCase = {
                name: this.process.TEST_NAME,
                description:
                    'Automatically created by nab-x-qe test creator',
                test_steps: [
                    {
                        description: 'Automated test step',
                        expected: 'Step should complete',
                    },
                ],
            };

            await this.setProxy();

            const { data, status } = await this.api.returnPost(
                qTestTestCasesUri,
                qTestConfig,
                testCase,
            );

            if (status === 200) {
                if (!data.id) {
                    await this.log.warning(
                        `No test cases found with the name '${testCaseName}'.`,
                    );
                } else {
                    return data.id;
                }
            }
        } catch (err: any) {
            throw new Error(
                err.stack !== undefined ? err.stack : err.message,
            );
        }

        return -1;
    }

    private async getTestID(
        testCaseName: string,
    ): Promise<number> {
        try {
            const qTestSearchUri = `${qTestAPIUrl}search?pageSize=100&page=1`;

            const query = {
                object_type: 'test-cases',
                fields: ['*'],
                query: `name = '${testCaseName}'`,
            };

            await this.setProxy();

            const { data, status } = await this.api.returnPost(
                qTestSearchUri,
                qTestConfig,
                query,
            );

            if (status === 200) {
                if (data.total === 0) {
                    await this.log.warning(
                        `No test cases found with the name '${testCaseName}'.`,
                    );

                    await this.log.debug(
                        'Adding the test case to the QTest library and suite.',
                    );

                    return await this.createTest(testCaseName);
                }

                if (data.total > 0 && data.items[0] !== null) {
                    if (data.total > 1) {
                        await this.log.warning(
                            `${data.total} test cases found with the name '${testCaseName}'.`,
                        );

                        await this.log.warning(
                            'Only adding test result for first.',
                        );

                        await this.log.warning(
                            'Please update your test names to be unique for your test script solution and the QTest Project test entity.',
                        );
                    }

                    return data.items[0].id;
                }
            } else {
                await this.log.warning(
                    `QTest axios response status ${status} - unable to complete retrieval of the test id to update test result for ${testCaseName}`,
                );
            }

            return -1;
        } catch (err: any) {
            throw new Error(
                err.stack !== undefined ? err.stack : err.message,
            );
        }
    }
}
