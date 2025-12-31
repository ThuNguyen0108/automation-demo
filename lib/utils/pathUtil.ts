import path from "node:path";

export class PathUtil {
    public sanitizePath(providedPath: string[] | string): string {
        if (typeof providedPath === 'string') {
            return path.normalize(providedPath);
        }
        if (Array.isArray(providedPath) && providedPath.length > 0) {
            return path.normalize(path.join(...providedPath));
        }
        throw new Error('File path cannot be empty');
    }

    public sanitizeDirectory(providedPath: string[] | string): string {
        const sanitizedPath: string = this.sanitizePath(providedPath);
        return sanitizedPath.endsWith(path.sep) ? sanitizedPath : sanitizedPath + path.sep;
    }
}