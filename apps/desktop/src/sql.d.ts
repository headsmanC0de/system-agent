declare module "sql.js" {
  interface Database {
    run(sql: string, params?: unknown[]): void;
    exec(sql: string, params?: unknown[]): Array<{ columns: string[]; values: unknown[][] }>;
    close(): void;
    export(): Uint8Array;
  }
  interface SqlJsStatic {
    Database: new (data?: ArrayLike<number>) => Database;
  }
  export default function init(): Promise<SqlJsStatic>;
}
