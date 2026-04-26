declare module 'better-sqlite3' {
  interface DatabaseOptions {
    fileMustExist?: boolean;
  }

  interface Statement {
    run(...params: unknown[]): any;
    all(...params: unknown[]): any[];
    get(...params: unknown[]): any;
  }

  interface Database {
    pragma(statement: string, options?: { simple: boolean }): unknown;
    pragma(statement: string): Database;
    exec(statement: string): Database;
    prepare(sql: string): Statement;
    transaction<T>(fn: () => T): () => T;
  }

  function Database(filename: string, options?: DatabaseOptions): Database;

  export default Database;
}
