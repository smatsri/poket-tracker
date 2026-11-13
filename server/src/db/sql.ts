export interface QueryResult<T> {
  rows: T[];
}

export interface Sql {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
  exec(text: string): Promise<void>;
}

export type QueryInterceptor = (
  text: string,
  params: readonly unknown[],
) => QueryResult<unknown> | undefined;

export interface Database extends Sql {
  transaction<T>(run: (sql: Sql) => Promise<T>): Promise<T>;
  setQueryInterceptor(interceptor: QueryInterceptor | undefined): void;
  close(): Promise<void>;
}
