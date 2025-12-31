import * as fs from 'fs';
import moment from 'moment';
import * as path from 'path';
import { CoreLibrary, CoreMaps } from '@core';
import { IFileUtil } from './fileUtil.interface';
import { DATE } from './supportUtil';
import { ITVTUtil } from './tvtUtil.interface';

let tvtComponent: string;

export class TVTUtil implements ITVTUtil {
  private static tvtList: any[];

  private get files(): IFileUtil {
    return CoreLibrary.files;
  }

  private get paths(): any {
    return CoreLibrary.paths;
  }

  private get process(): any {
    return CoreLibrary.process;
  }

  private get support(): any {
    return CoreLibrary.support;
  }

  public isTVT(): boolean {
    return this.process.REPORTING === 'tvt';
  }

  public getTVTComponentName(): string {
    return tvtComponent || 'Component not defined in test file.';
  }

  public setTVTComponentName(component: string): void {
    tvtComponent = component;
  }

  public async tvtTestStart(title: string): Promise<void> {
    if (this.isTVT()) {
      await CoreMaps._txn.set(
        `startTime_${title}`,
        moment(new Date()).format(DATE.dateTimeFormatSlash),
      );
    }
  }

  public async tvtEntry(test: any, result: any): Promise<void> {
    if (this.isTVT()) {
      const tvtReport = {
        // requires the NAB team/service/group name in the process.env.TVT_SERVICE_NAME
        serviceName: this.process.TVT_SERVICE_NAME,

        // todo: cur. unsure how component name is defined
        // derived from the test functionality to highlight the product area being tested i.e. auth, payment
        componentName: this.getTVTComponentName(),

        // unique identifier for the test, must not duplicate in any way other entries in the run
        testID: `${this.process.TEST_FILENAME} [${test.title}]`,
        testName: test.title,

        // this.env.TVT_SUPPORT_LINK must be populated with appropriate support link for the application
        supportLink: this.process.TVT_SUPPORT_LINK,

        startTime: CoreMaps._txn.get(`startTime_${test.title}`),
        endTime: await moment(new Date()).format(
          DATE.dateTimeFormatSlash,
        ),

        // result.duration is in milliseconds so returning seconds
        runTime: result.duration / 1000,
        status: result.passed ? 'pass' : 'fail',

        // this.env.BUILD_NUMBER will only be available from Pipeline execution
        executionLogLink: `Build Number: ${this.process.BUILD_NUMBER}`,
        error: result.error ? result.error : 'none',
      };

      TVTUtil.tvtList.push(tvtReport);
    }
  }

  public async tvtFinaliseFile(): Promise<void> {
    if (this.isTVT()) {
      try {
        const fileName: any = this.paths.sanitizePath(
          path.resolve(
            `${this.paths.output}TVT_${this.process.TVT_PRODUCT_NAME.toUpperCase()}.json`,
          ),
        );

        fs.writeFile(
          fileName,
          JSON.stringify(TVTUtil.tvtList),
          { flag: 'a+' },
          function (error): boolean | undefined {
            if (error)
              return process.stdout.write(`tvt err1:${error}\n`);
          },
        );

        // need to clean up the file for use because WDIO hooks are unclear in their use cases and causing re-run
        if (fs.existsSync(fileName)) {
          await fs.readFile(
            fileName,
            { encoding: 'utf8' },
            async function (
              err,
              data,
            ): Promise<boolean | undefined> {
              if (err)
                return process.stdout.write(`tvt err2:${err}\n`);

              await fs.writeFile(
                fileName,
                data.replace('[{', '{').replace('}]', '}'),
                { encoding: 'utf8' },
                function (
                  err2,
                ): boolean | undefined {
                  if (err2)
                    return process.stdout.write(`tvt err3:${err2}\n`);
                },
              );
            },
          );
        }
      } catch (err: any) {
        throw new Error(
          err.stack !== undefined ? err.stack : err.message,
        );
      }
    }
  }
}
