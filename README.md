# PWA-DB
A lightweight, browser-based RDBMS for Angular PWAs using IndexedDB.
Build offline-first web applications with SQL-like queries, multi-table support, and Angular-friendly services.

[![npm version](https://img.shields.io/npm/v/pwa-db.svg)](https://www.npmjs.com/package/pwa-db)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Angular](https://img.shields.io/badge/Angular-20.3.0-red.svg)](https://angular.io/)

---

## What It Does

PWA-DB allows developers to create, read, update, and delete relational data in the browser.  
It provides:

- Full SQL-like engine for web applications (with optional in-browser REPL Console)
- IndexedDB-backed persistent storage
- Angular-friendly services with TypeScript typings
- Multi-table, multi-database support
- Easy CRUD operations (`create`, `read`, `update`, `delete`) with `DatabaseService` and `SqlEngineService`

## Why Use PWA-DB?

- Build offline-first PWAs with relational data
- No server required for local storage
- Works seamlessly with Angular’s DI and reactive forms
- Ideal for demo apps, local caching, offline-first dashboards/PWAs, or prototyping  

## Installation

```bash
npm install github:webdevs-ke/pwa-db

---

## **3. Quick Start Guide**

A minimal example Home Library Demo App:

### Prerequisites
   1. Create a new Angular project
   2. Install PWA-DB in project root: 
      ```bash
      npm install github:webdevs-ke/pwa-db
      ```
   3. Create a LibraryDbService
      ```bash
      ng g service services/library-db-service
      ```
   4. Add the code below to the .ts file created by the above command then import this file to your component as you like.

```markdown
## Quick Start

```ts
import { Injectable } from '@angular/core'
import { SqlEngineService } from 'pwa-db'  // API from the installed library package :PWA-DB

@Injectable({
  providedIn: 'root',
})
export class LibraryDbService {

  private initialized = false
  currentUser: any = null

  constructor(private sql: SqlEngineService) {}  // inject API

  /* ---------- PUBLIC API TO USE IN COMPONENT ---------- */

  async registerUser(user: any) {
    await this.init()

    this.validateUser(user)

    return this.sql.execute(
      `INSERT INTO users VALUES (${user.id}, '${user.name}', '${user.email}', '${user.phone}')`
    )
  }

  async login(email: string, phone: string) {
    const sql = `SELECT * FROM users WHERE email = '${email}'`
    await this.init()
    const rows = await this.sql.execute(`SELECT * FROM users WHERE email = '${email}'`)

    const user = rows.rows.find((u: any) => u.phone === phone)
    if (!user) throw new Error('Invalid credentials')

    this.currentUser = user
    return user
  }

  async addBook(title: string, typeID: number) {
    await this.init()

    if (!this.currentUser) throw new Error('Not logged in')

    const id = Date.now()
    return this.sql.execute(
      `INSERT INTO books VALUES (${id}, '${title}', NULL, ${typeID}, ${this.currentUser.id})`
    )
  }

  async myBooks() {
    await this.init()
    const books = await this.sql.execute(`SELECT * FROM books WHERE userID = ${this.currentUser.id}`)
    return books.rows
  }

  async bookTypes() {
    await this.init()
    const bookTypes = await this.sql.execute(`SELECT * FROM book_types`)
    return bookTypes.rows
  }

  /* ---------- INIT ---------- */
  private async init() {
    if (this.initialized) return

    // create + use database
    const dbs = await this.sql.execute('SHOW DATABASES')
    if (!dbs.includes('library')) {
      await this.sql.execute('CREATE DATABASE library')
    }

    await this.sql.execute('USE library')

    // ensure tables
    const tablesResp = await this.sql.execute('SHOW TABLES')
    const tables = tablesResp.tables

    if (!tables.includes('users')) {
      await this.createUsersTable()
    }

    if (!tables.includes('book_types')) {
      await this.createBookTypesTable()
    }

    if (!tables.includes('books')) {
      await this.createBooksTable()
    }

    this.initialized = true
  }

  private async createUsersTable() {
    await this.sql.execute(`CREATE TABLE users (id INT PRIMARY, name TEXT, email TEXT UNIQUE, phone TEXT UNIQUE)`)
  }

  private async createBookTypesTable() {
    await this.sql.execute(`CREATE TABLE book_types (id INT PRIMARY, type TEXT UNIQUE)`)

    await this.sql.execute(`INSERT INTO book_types VALUES (1, Fiction)`)
    await this.sql.execute(`INSERT INTO book_types VALUES (2, Non-Fiction)`)
  }

  private async createBooksTable() {
    await this.sql.execute(`CREATE TABLE books (id INT PRIMARY, title TEXT UNIQUE, file BLOB, typeID INT, userID INT)`)
  }

  private validateUser(user: any) {
    if (typeof user.id !== 'number') {
      throw new Error('User id must be a number')
    }

    if (typeof user.name !== 'string' || user.name.length < 5) {
      throw new Error('Name must be a valid string')
    }

    if (!this.isValidEmail(user.email)) {
      throw new Error('Invalid email format')
    }

    if (!(/^\d+$/.test(user.phone)) || user.phone.length !== 10) {
      throw new Error('Phone must be a number of 10 digits')
    }
  }

  private isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }
}


---

## **4. Full API Documentation**

Public classes, methods, and their usage:

```ts

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
}
```
---

## **5. Application Areas / Use Cases**

Application areas that PWA-DB shines:

```markdown
## Potential Application Areas

- Offline-first Progressive Web Apps (PWAs)
- Educational apps demonstrating SQL in the browser - by implementing a REPL Console using SQLEngineService
- Single-page apps requiring local relational storage
- Client-side dashboards with temporary or persistent datasets
- Rapid prototyping of CRUD applications

## Contributing

Contributions, issues, and feature requests are welcome.  
Please follow standard Angular library development practices when submitting pull requests.

## Support

- GitHub Issues: [https://github.com/webdevs-ke/pwa-db/issues](https://github.com/webdevs-ke/pwa-db/issues)
- Email: katikumut@gmail.com
- Live Demo: [https://ngrdbms.netlify.app](https://ngrdbms.netlify.app)
- Author: [https://benkatiku.netlify.app](https://benkatiku.netlify.app)

