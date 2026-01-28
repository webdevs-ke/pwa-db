import * as i0 from '@angular/core';

declare class IndexedDbService {
    private db;
    private opened;
    constructor();
    open(): Promise<void>;
    saveTable(name: string, data: any): Promise<void>;
    loadTable(name: string): Promise<any>;
    deleteTable(name: string): Promise<void>;
    tableExists(name: string): Promise<boolean>;
    iterateKeys(cb: (key: IDBValidKey) => void): Promise<void>;
    deleteByPrefix(prefix: string): Promise<void>;
    static ɵfac: i0.ɵɵFactoryDeclaration<IndexedDbService, never>;
    static ɵprov: i0.ɵɵInjectableDeclaration<IndexedDbService>;
}

type DataType = 'INT' | 'TEXT' | 'BLOB';
interface Column {
    name: string;
    type: DataType;
    primary?: boolean;
    unique?: boolean;
}

type SqlStatement = CreateDatabaseStmt | UseDatabaseStmt | ShowDatabasesStmt | DropDatabaseStmt | ShowTablesStmt | CreateTableStmt | DropTableStmt | AlterTableStmt | InsertStmt | SelectStmt | UpdateStmt | DeleteStmt;
interface CreateDatabaseStmt {
    kind: 'CREATE_DATABASE';
    name: string;
}
interface UseDatabaseStmt {
    kind: 'USE_DATABASE';
    name: string;
}
interface ShowDatabasesStmt {
    kind: 'SHOW_DATABASES';
}
interface DropDatabaseStmt {
    kind: 'DROP_DATABASE';
    name: string;
}
interface ShowTablesStmt {
    kind: 'SHOW_TABLES';
}
interface CreateTableStmt {
    kind: 'CREATE_TABLE';
    table: string;
    columns: {
        name: string;
        datatype: string;
        primary: boolean;
        unique: boolean;
    }[];
}
interface DropTableStmt {
    kind: 'DROP_TABLE';
    table: string;
}
type AlterAction = {
    type: 'ADD_COLUMN';
    column: Column;
} | {
    type: 'DROP_COLUMN';
    column: string;
} | {
    type: 'RENAME_COLUMN';
    from: string;
    to: string;
} | {
    type: 'RENAME_TABLE';
    to: string;
};
interface AlterTableStmt {
    kind: 'ALTER_TABLE';
    table: string;
    actions: AlterAction[];
}
interface InsertStmt {
    kind: 'INSERT';
    table: string;
    values: (string | number)[];
}
interface SelectStmt {
    kind: 'SELECT';
    table: string;
    columns: string[];
    where?: {
        col: string;
        value: any;
    };
}
interface UpdateStmt {
    kind: 'UPDATE';
    table: string;
    set: Record<string, any>;
    where: {
        col: string;
        value: any;
    };
}
interface DeleteStmt {
    kind: 'DELETE';
    table: string;
    where: {
        col: string;
        value: any;
    };
}

declare class Table {
    name: string;
    columns: Column[];
    rows: any[];
    indexes: Map<string, Map<any, any>>;
    constructor(name: string, columns: Column[], rows: any[]);
    insert(row: any): void;
    select(where?: {
        col: string;
        value: any;
    }, columns?: string[]): any[];
    update(where: {
        col: string;
        value: any;
    }, changes: any): void;
    delete(where: {
        col: string;
        value: any;
    }): void;
    applyAlter(action: AlterAction): void;
}

declare class DatabaseService {
    private store;
    private currentDB;
    private databases;
    tables: Map<string, Table>;
    constructor(store: IndexedDbService);
    private init;
    useDatabase(name: string): Promise<void>;
    private persistDatabases;
    createDatabase(name: string): Promise<void>;
    listDatabases(): Promise<string[]>;
    listTables(): Promise<string[]>;
    dropDatabase(name: string): Promise<void>;
    createTable(name: string, columns: Column[]): Promise<void>;
    dropTable(tableName: string): Promise<void>;
    renameTable(oldName: string, newName: string): Promise<Table>;
    insert(tableName: string, row: any): Promise<Table>;
    update(tableName: string, where: any, set: any): Promise<Table>;
    delete(tableName: string, where: any): Promise<Table>;
    select(tableName: string, where: any, columns?: string[]): Promise<Table>;
    persist(name: string): void;
    table(name: string): Promise<Table>;
    loadTable(name: string): Promise<Table>;
    static ɵfac: i0.ɵɵFactoryDeclaration<DatabaseService, never>;
    static ɵprov: i0.ɵɵInjectableDeclaration<DatabaseService>;
}

declare class SqlParser {
    parse(sql: string): SqlStatement;
    private parseCreateDatabase;
    private parseDropDatabase;
    private parseUseDatabase;
    private parseCreate;
    private parseDropTable;
    private parseAlterTable;
    private parseInsert;
    private parseSelect;
    private parseUpdate;
    private parseDelete;
    private cleanValue;
    private splitValues;
    private splitAssignments;
}

declare class SqlEngineService {
    private db;
    private parser;
    constructor(db: DatabaseService);
    execute(sql: string): Promise<any>;
    private executeAst;
    static ɵfac: i0.ɵɵFactoryDeclaration<SqlEngineService, never>;
    static ɵprov: i0.ɵɵInjectableDeclaration<SqlEngineService>;
}

declare class PwaDb {
    static ɵfac: i0.ɵɵFactoryDeclaration<PwaDb, never>;
    static ɵcmp: i0.ɵɵComponentDeclaration<PwaDb, "lib-pwa-db", never, {}, {}, never, never, true, never>;
}

export { DatabaseService, IndexedDbService, PwaDb, SqlEngineService, SqlParser, Table };
export type { AlterAction, AlterTableStmt, Column, CreateDatabaseStmt, CreateTableStmt, DataType, DeleteStmt, DropDatabaseStmt, DropTableStmt, InsertStmt, SelectStmt, ShowDatabasesStmt, ShowTablesStmt, SqlStatement, UpdateStmt, UseDatabaseStmt };
