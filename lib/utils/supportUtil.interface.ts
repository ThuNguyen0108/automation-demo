export type DecryptionResult = {
    success: Boolean;
    data?: string;
    error?: string;
};

export interface ICoreSupportUtil {
    toBool: (value: string | boolean | number) => boolean;
    isNull: (obj: any) => boolean;
    isNumber: (checkThis: any) => Boolean;
    randomString: (length: number) => string;
    splitMulti: (str: string, tokens: string[]) => string[];
    getOS: () => string;
    getGitUrl: () => Promise<string>;
    // isCypress: () => boolean;
    // isJest: () => boolean;
    isPlaywright: () => boolean;
    isWDIO: () => boolean;
    isBrowser: () => boolean;
    isDevice: () => boolean;
    isAppium: () => boolean;
    isPerfecto: () => boolean;
    isWin: () => boolean;
    isLinux: () => boolean;
    isMac: () => boolean;
    getAllFunctions: (toCheck: any) => Promise<string[]>;
    cleanString: (stringToClean: string) => string;
    getGitBranchName(): Promise<string>;

    /**
     * Encrypted a string using AES-256-CBC encryption with a password.
     *
     * This function take a plaintext string and encrypts it using the AES-256-CBC algorithm.
     * The encryption key is derived from the provided password using SHA-256, and a random
     * initialization vector (IV) is generated for added security. The resulting output includes
     * both the IV and the encrypted text, separate by a colon (':')
     *
     * @param {string} value - The plaintext string to encrypt.
     * @param {string} password - The password used to derived the encryption key.
     * @returns {string} The encrypted string in format '<IV>:<Encryptedtext>'
     */
    encryptString: (value: string, password: string) => Promise<string>;

    /**
     * Decrypted a string encrypted with the 'encryptString'.
     *
     * This function take an encrypted string in the format '<IV>:<EncryptedText>' and decrypts it
     * using the AES-256-CBC algorithm. The encryption key is derived from the provided password
     * using SHA-256, and the IV is extracted from the encrypted input to decrypt the text.
     *
     * @param {string} encrypted - The encrypted in the format '<IV>:<EncryptedText>'
     * @param {string} password - The password used to derived the encryption key.
     * @returns {string} The decrypted plaintext string
     */
    decryptString: (
        encrypted: string,
        password: string,
    ) => Promise<DecryptionResult>;
}
