import { ILogUtil } from './logUtil.interface';

export declare type TStatus = 'PASSED' | 'FAILED';

export const Format = {
  Reset: '\x1b[0m',
  Italic: '\x1b[3m',
  Bright: '\x1b[1m',
  Dim: '\x1b[2m',
  Underscore: '\x1b[4m',
  Blink: '\x1b[5m',
  Reverse: '\x1b[7m',
  Hidden: '\x1b[8m',
  FgBlack: '\x1b[30m',
  FgRed: '\x1b[31m',
  FgRedDark: '\x1b[2m\x1b[31m',
  FgGreen: '\x1b[32m',
  FgGreenLight: '\x1b[38;5;192m',
  FgGreenDark: '\x1b[38;5;22m',
  FgLime: '\x1b[38;5;154m',
  FgOrange: '\x1b[38;5;172m',
  FgYellowLight: '\x1b[38;5;228m',
  FgYellow: '\x1b[33m',
  FgYellowDark: '\x1b[2m\x1b[33m',
  FgBlueLight: '\x1b[38;5;87m',
  FgBlue: '\x1b[34m',
  FgBlueDark: '\x1b[2m\x1b[34m',
  FgMagenta: '\x1b[38;5;165m',
  FgMagentaDark: '\x1b[2m\x1b[35m',
  FgCyan: '\x1b[36m',
  FgCyanDark: '\x1b[2m\x1b[36m',
  FgWhite: '\x1b[37m',
  FgGreyLight: '\x1b[2m\x1b[37m',
  FgGrey: '\x1b[2m\x1b[37m',
  FgGreyMid: '\x1b[2m\x1b[30m',
  FgPink: '\x1b[38;5;13m',
  BgBlack: '\x1b[40m',
  BgRed: '\x1b[41m',
  BgGreen: '\x1b[42m',
  BgYellow: '\x1b[43m',
  BgBlue: '\x1b[44m',
  BgMagenta: '\x1b[45m',
  BgCyan: '\x1b[46m',
  BgWhite: '\x1b[47m',
};

export class LogUtil implements ILogUtil {
  public static stepStart: string | undefined;

  public async debug(
    msg: string | any[],
    data: any = ''
  ): Promise<void> {
    await process.stdout.write(
      `${Format.FgGreyLight}Debug${Format.Reset} | ${msg}\n${data}`
    );
  }

  public environment(
    msg: string,
    data: any = ''
  ): void {
    process.stdout.write(
      `${Format.FgBlueLight}Environment${Format.Reset} | ${msg}\n${data}`
    );
  }

  public async step(
    msg: string,
    start?: boolean
  ): Promise<void> {
    if (start) LogUtil.stepStart = msg;
    await process.stdout.write(`Step | ${msg}\n`);
  }

  public async stepEnd(): Promise<void> {
    if (LogUtil.stepStart)
      await process.stdout.write(
        `StepEnd | ${LogUtil.stepStart}\n`
      );
    LogUtil.stepStart = undefined;
  }

  public async warning(msg: string): Promise<void> {
    await process.stdout.write(
      `${Format.FgOrange}Warning${Format.Reset} | ${msg}\n`
    );
  }

  public async ally(
    status: string,
    msg: string
  ): Promise<void> {
    await process.stdout.write(
      `${Format.FgOrange}Ally ${status}${Format.Reset} | ${msg}\n`
    );
  }

  public async performance(
    msg: string
  ): Promise<void> {
    await process.stdout.write(
      `${Format.FgCyanDark}PERFORMANCE${Format.Reset} | ${msg}\n`
    );
  }

  public async result(
    compare: boolean,
    msg: string
  ): Promise<void> {
    if (compare) {
      await this.pass(msg);
    } else {
      await this.fail(msg);
    }
  }

  public async pass(msg: string): Promise<void> {
    // Clean output - just the message without Jest console formatting
    await process.stdout.write(
      `${Format.Italic}${Format.Dim}PASSED${Format.Reset} | ${msg}\n`
    );
  }

  public async fail(msg: string): Promise<void> {
    await process.stdout.write(
      `${Format.FgRed}FAILED${Format.Reset} | ${msg}\n`
    );
    throw new Error(msg);
  }

  public async err(msg: string): Promise<void> {
    await process.stdout.write(
      `${Format.FgMagenta}Error${Format.Reset} | ${msg}\n`
    );
    throw new Error(msg);
  }

  public async retry(msg: string): Promise<void> {
    await process.stdout.write(
      `${Format.FgBlueLight}RETRY${Format.Reset} | ${msg}\n`
    );
  }
}
