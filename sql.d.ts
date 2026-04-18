declare module 'sql.js' {
  export interface Statement {
    bind(values?: any[]): boolean;
    step(): boolean;
    getAsObject(columnNames?: string[]): any;
    get(params?: any[]): any[];
    free(): void;
  }

  export interface Database {
    run(sql: string, params?: any[]): Database;
    exec(sql: string): any[];
    prepare(sql: string): Statement;
    export(): Uint8Array;
    close(): void;
  }

  export interface SqlJsStatic {
    Database: new (data?: ArrayLike<number> | Buffer) => Database;
  }

  export default function initSqlJs(config?: any): Promise<SqlJsStatic>;
}
