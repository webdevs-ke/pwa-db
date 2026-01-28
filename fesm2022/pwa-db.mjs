import * as i0 from '@angular/core';
import { Injectable, Component } from '@angular/core';

class IndexedDbService {
    db;
    opened = false;
    constructor() { }
    async open() {
        if (this.opened)
            return;
        if (typeof window === 'undefined' || !window.indexedDB)
            return;
        this.opened = true;
        return new Promise((resolve, reject) => {
            const req = window.indexedDB.open('pwa-db', 1);
            req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains('tables')) {
                    db.createObjectStore('tables');
                }
            };
            req.onsuccess = () => {
                this.db = req.result;
                resolve();
            };
            req.onerror = () => reject(req.error);
        });
    }
    async saveTable(name, data) {
        return new Promise((resolve, reject) => {
            if (!this.db)
                return resolve();
            const tx = this.db.transaction('tables', 'readwrite');
            tx.objectStore('tables').put(data, name);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }
    async loadTable(name) {
        return new Promise(resolve => {
            if (!this.db)
                return resolve(null);
            const tx = this.db.transaction('tables');
            const req = tx.objectStore('tables').get(name);
            req.onsuccess = () => resolve(req.result);
        });
    }
    async deleteTable(name) {
        return new Promise((resolve, reject) => {
            if (!this.db)
                return resolve();
            const tx = this.db.transaction('tables', 'readwrite');
            const store = tx.objectStore('tables');
            store.delete(name);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error);
        });
    }
    async tableExists(name) {
        return new Promise(resolve => {
            if (!this.db)
                return resolve(false);
            const tx = this.db.transaction('tables', 'readonly');
            const req = tx.objectStore('tables').get(name);
            req.onsuccess = () => resolve(!!req.result);
            req.onerror = () => resolve(false);
        });
    }
    async iterateKeys(cb) {
        return new Promise(resolve => {
            const tx = this.db.transaction('tables');
            const store = tx.objectStore('tables');
            const req = store.openCursor();
            req.onsuccess = () => {
                const cursor = req.result;
                if (!cursor)
                    return resolve();
                cb(cursor.key);
                cursor.continue();
            };
        });
    }
    async deleteByPrefix(prefix) {
        const tx = this.db.transaction('tables', 'readwrite');
        const store = tx.objectStore('tables');
        const req = store.openCursor();
        req.onsuccess = () => {
            const cursor = req.result;
            if (!cursor)
                return;
            const key = cursor.key;
            if (typeof key === 'string' && key.startsWith(prefix)) {
                cursor.delete();
            }
            cursor.continue();
        };
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.3.16", ngImport: i0, type: IndexedDbService, deps: [], target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "20.3.16", ngImport: i0, type: IndexedDbService, providedIn: 'root' });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.3.16", ngImport: i0, type: IndexedDbService, decorators: [{
            type: Injectable,
            args: [{
                    providedIn: 'root',
                }]
        }], ctorParameters: () => [] });

class Table {
    name;
    columns;
    rows;
    indexes = new Map();
    constructor(name, columns, rows) {
        this.name = name;
        this.columns = columns;
        this.rows = rows;
        for (const c of columns) {
            if (c.primary || c.unique) {
                this.indexes.set(c.name, new Map());
            }
        }
    }
    insert(row) {
        for (const col of this.columns) {
            if (col.primary || col.unique) {
                const idx = this.indexes.get(col.name);
                if (idx.has(row[col.name])) {
                    throw new Error(`Duplicate value for ${col.name}`);
                }
                idx.set(row[col.name], row);
            }
        }
        this.rows.push(row);
    }
    select(where, columns = ['*']) {
        let result;
        if (!where)
            result = [...this.rows];
        else {
            const idx = this.indexes.get(where.col);
            if (idx && idx.has(where.value)) {
                result = [idx.get(where.value)];
            }
            else {
                result = this.rows.filter(r => r[where.col] === where.value);
            }
        }
        // '*' returns full rows
        if (columns.length === 1 && columns[0] === '*') {
            return result;
        }
        // validate + project
        return result.map(row => {
            const projected = {};
            for (const col of columns) {
                if (!(col in row)) {
                    throw new Error(`Unknown column '${col}'`);
                }
                projected[col] = row[col];
            }
            return projected;
        });
    }
    update(where, changes) {
        for (const row of this.rows) {
            if (row[where.col] === where.value) {
                Object.assign(row, changes);
            }
        }
    }
    delete(where) {
        this.rows = this.rows.filter(r => r[where.col] !== where.value);
        const idx = this.indexes.get(where.col);
        if (idx)
            idx.delete(where.value);
    }
    applyAlter(action) {
        switch (action.type) {
            case 'ADD_COLUMN': {
                if (this.columns.some(c => c.name === action.column.name)) {
                    throw new Error('Column already exists');
                }
                this.columns.push(action.column);
                // initialize existing rows
                for (const row of this.rows) {
                    row[action.column.name] = null;
                }
                break;
            }
            case 'DROP_COLUMN': {
                const idx = this.columns.findIndex(c => c.name === action.column);
                if (idx === -1)
                    throw new Error('Column not found');
                const col = this.columns[idx];
                if (col.primary)
                    throw new Error('Cannot drop PRIMARY KEY');
                this.columns.splice(idx, 1);
                for (const row of this.rows) {
                    delete row[action.column];
                }
                break;
            }
            case 'RENAME_COLUMN': {
                const col = this.columns.find(c => c.name === action.from);
                if (!col)
                    throw new Error('Column not found');
                if (this.columns.some(c => c.name === action.to)) {
                    throw new Error('Target column already exists');
                }
                col.name = action.to;
                for (const row of this.rows) {
                    row[action.to] = row[action.from];
                    delete row[action.from];
                }
                break;
            }
        }
    }
}

class DatabaseService {
    store;
    currentDB = 'default';
    databases = new Set();
    tables = new Map();
    constructor(store) {
        this.store = store;
        this.init();
    }
    async init() {
        await this.store.open();
        const saved = await this.store.loadTable('__databases__');
        if (saved)
            this.databases = new Set(saved);
        else {
            this.databases.add('default');
            await this.persistDatabases();
        }
        await this.useDatabase('default');
    }
    async useDatabase(name) {
        if (!this.databases.has(name)) {
            throw new Error(`Database ${name} does not exist`);
        }
        this.currentDB = name;
        this.tables.clear();
    }
    async persistDatabases() {
        await this.store.saveTable('__databases__', [...this.databases]);
    }
    async createDatabase(name) {
        if (this.databases.has(name))
            return;
        this.databases.add(name);
        await this.persistDatabases();
    }
    async listDatabases() {
        return [...this.databases];
    }
    async listTables() {
        const prefix = `${this.currentDB}::`;
        const tables = [];
        await this.store.iterateKeys(key => {
            if (typeof key === 'string' && key.startsWith(prefix)) {
                tables.push(key.replace(prefix, ''));
            }
        });
        return tables;
    }
    async dropDatabase(name) {
        if (name === 'default') {
            throw new Error('Cannot drop default database');
        }
        if (!this.databases.has(name))
            return;
        this.databases.delete(name);
        await this.persistDatabases();
        // delete all tables belonging to this DB
        await this.store.deleteByPrefix(`${name}::`);
        if (this.currentDB === name) {
            await this.useDatabase('default');
        }
    }
    async createTable(name, columns) {
        const key = `${this.currentDB}::${name}`;
        if (this.tables.has(name))
            return;
        const table = new Table(name, columns, []);
        const saved = await this.store.loadTable(key);
        if (saved)
            Object.assign(table, saved);
        this.tables.set(name, table); // insert into memory
        await this.store.saveTable(key, this.tables.get(name)); // insert into IndexedDB (from memory)
    }
    async dropTable(tableName) {
        const key = `${this.currentDB}::${tableName}`;
        const exists = await this.store.tableExists(key);
        if (!exists) {
            throw new Error(`Table ${tableName} does not exist`);
        }
        await this.store.deleteTable(key); // remove from IndexedDB
        this.tables.delete(tableName); // remove from memory
    }
    async renameTable(oldName, newName) {
        if (this.tables.has(newName)) {
            throw new Error('Target table already exists');
        }
        const oldKey = `${this.currentDB}::${oldName}`;
        const newKey = `${this.currentDB}::${newName}`;
        const table = await this.table(oldName);
        table.name = newName; // update table object  
        await this.store.saveTable(newKey, table); // persist under new key    
        await this.store.deleteByPrefix(oldKey); // remove old key
        this.tables.delete(oldName); // update in-memory map
        this.tables.set(newName, table);
        return table;
    }
    async insert(tableName, row) {
        const table = await this.table(tableName);
        table.insert(row);
        this.persist(tableName);
        return table;
    }
    async update(tableName, where, set) {
        const table = await this.table(tableName);
        table.update(where, set);
        this.persist(tableName);
        return table;
    }
    async delete(tableName, where) {
        const table = await this.table(tableName);
        table.delete(where);
        this.persist(tableName);
        return table;
    }
    async select(tableName, where, columns = ['*']) {
        const table = await this.table(tableName);
        table.select(where, columns);
        return table;
    }
    persist(name) {
        const key = `${this.currentDB}::${name}`;
        this.store.saveTable(key, this.tables.get(name));
    }
    async table(name) {
        let table = this.tables.get(name); // try loading table from memory
        if (!table) // table does not exist in memory
            table = await this.loadTable(name); // try loading table from disk, i.e., IndexedDB
        return table;
    }
    async loadTable(name) {
        const key = `${this.currentDB}::${name}`; // tables load from current DB
        const saved = await this.store.loadTable(key);
        if (!saved) {
            throw new Error(`Table ${name} does not exist`);
        }
        const table = new Table(//initialize a table model from saved table's data
        saved.name, saved.columns, saved.rows ?? []);
        this.tables.set(name, table); // add table model initialized from disk to memory
        return table;
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.3.16", ngImport: i0, type: DatabaseService, deps: [{ token: IndexedDbService }], target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "20.3.16", ngImport: i0, type: DatabaseService, providedIn: 'root' });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.3.16", ngImport: i0, type: DatabaseService, decorators: [{
            type: Injectable,
            args: [{
                    providedIn: 'root',
                }]
        }], ctorParameters: () => [{ type: IndexedDbService }] });

class SqlParser {
    parse(sql) {
        sql = sql.trim();
        const upper = sql.toUpperCase();
        if (upper.startsWith('CREATE DATABASE'))
            return this.parseCreateDatabase(sql);
        if (upper.startsWith('DROP DATABASE'))
            return this.parseDropDatabase(sql);
        if (upper === 'SHOW DATABASES')
            return { kind: 'SHOW_DATABASES' };
        if (upper.startsWith('USE'))
            return this.parseUseDatabase(sql);
        if (upper === 'SHOW TABLES')
            return { kind: 'SHOW_TABLES' };
        if (upper.startsWith('DROP TABLE'))
            return this.parseDropTable(sql);
        if (upper.startsWith('ALTER TABLE'))
            return this.parseAlterTable(sql);
        if (upper.startsWith('CREATE TABLE'))
            return this.parseCreate(sql);
        if (upper.startsWith('INSERT'))
            return this.parseInsert(sql);
        if (upper.startsWith('SELECT'))
            return this.parseSelect(sql);
        if (upper.startsWith('UPDATE'))
            return this.parseUpdate(sql);
        if (upper.startsWith('DELETE'))
            return this.parseDelete(sql);
        throw new Error('Invalid SQL statement');
    }
    parseCreateDatabase(sql) {
        const [, name] = /CREATE DATABASE (\w+)/i.exec(sql) || [];
        if (!name)
            throw new Error(`Invalid CREATE DATABASE syntax: ${sql}`);
        return {
            kind: 'CREATE_DATABASE',
            name
        };
    }
    parseDropDatabase(sql) {
        const [, name] = /DROP DATABASE (\w+)/i.exec(sql) || [];
        if (!name)
            throw new Error(`Invalid DROP DATABASE syntax: ${sql}`);
        return {
            kind: 'DROP_DATABASE',
            name
        };
    }
    parseUseDatabase(sql) {
        const [, name] = /USE (\w+)/i.exec(sql) || [];
        if (!name)
            throw new Error(`Invalid USE syntax: ${sql}`);
        return {
            kind: 'USE_DATABASE',
            name
        };
    }
    parseCreate(sql) {
        const match = /CREATE\s+TABLE\s+(\w+)\s*\((.+)\)/i.exec(sql);
        if (!match)
            throw new Error(`Invalid CREATE TABLE syntax: ${sql}`);
        const [, table, cols] = match;
        return {
            kind: 'CREATE_TABLE',
            table,
            columns: cols.split(',').map(c => {
                const p = c.trim().split(/\s+/);
                return {
                    name: p[0],
                    datatype: p[1],
                    primary: p.includes('PRIMARY'),
                    unique: p.includes('UNIQUE')
                };
            })
        };
    }
    parseDropTable(sql) {
        const match = /DROP TABLE (\w+)/i.exec(sql);
        if (!match)
            throw new Error(`Invalid DROP TABLE syntax: ${sql}`);
        const [, table] = match;
        return {
            kind: 'DROP_TABLE',
            table
        };
    }
    parseAlterTable(sql) {
        // normalize spacing
        sql = sql.trim().replace(/\s+/g, ' ');
        let m = /^ALTER TABLE (\w+) ADD COLUMN (\w+) (\w+)/i.exec(sql);
        if (m) {
            const [, table, name, datatype] = m;
            return {
                kind: 'ALTER_TABLE',
                table,
                actions: [{
                        type: 'ADD_COLUMN',
                        column: {
                            name,
                            type: datatype,
                            primary: false,
                            unique: false
                        }
                    }]
            };
        }
        m = /^ALTER TABLE (\w+) DROP COLUMN (\w+)/i.exec(sql);
        if (m) {
            const [, table, column] = m;
            return {
                kind: 'ALTER_TABLE',
                table,
                actions: [{ type: 'DROP_COLUMN', column }]
            };
        }
        m = /^ALTER TABLE (\w+) RENAME COLUMN (\w+) TO (\w+)/i.exec(sql);
        if (m) {
            const [, table, from, to] = m;
            return {
                kind: 'ALTER_TABLE',
                table,
                actions: [{ type: 'RENAME_COLUMN', from, to }]
            };
        }
        m = /^ALTER TABLE (\w+) RENAME TO (\w+)/i.exec(sql);
        if (m) {
            const [, table, to] = m;
            return {
                kind: 'ALTER_TABLE',
                table,
                actions: [{ type: 'RENAME_TABLE', to }]
            };
        }
        throw new Error(`Invalid ALTER TABLE syntax: {$sql}`);
    }
    parseInsert(sql) {
        const match = /INSERT\s+INTO\s(\w+)\s+VALUES\s*\((.+)\)\s*;?/i.exec(sql);
        if (!match)
            throw new Error(`Invalid INSERT syntax: ${sql}`);
        const [, table, vals] = match;
        return {
            kind: 'INSERT',
            table,
            values: this.splitValues(vals)
        };
    }
    parseSelect(sql) {
        const match = /SELECT\s+(.+?)\s+FROM\s+(\w+)(?:\s+WHERE\s+(\w+)\s*=\s*(.+))?\s*;?/i.exec(sql);
        if (!match)
            throw new Error(`Invalid SELECT syntax: ${sql}`);
        const [, cols, table, col, val] = match;
        return {
            kind: 'SELECT',
            table,
            columns: cols.trim() === '*'
                ? ['*']
                : cols.split(',').map(c => c.trim()),
            where: col
                ? { col, value: this.cleanValue(val) }
                : undefined
        };
    }
    parseUpdate(sql) {
        const match = /UPDATE\s+(\w+)\s+SET\s+(.+?)\s+WHERE\s+(\w+)\s*=\s*(.+)\s*;?/i.exec(sql);
        if (!match)
            throw new Error(`Invalid UPDATE syntax: ${sql}`);
        const [, table, setPart, col, val] = match;
        const changes = {};
        this.splitAssignments(setPart).forEach(p => {
            const [k, v] = p.split('=');
            changes[k.trim()] = this.cleanValue(v);
        });
        return {
            kind: 'UPDATE',
            table,
            set: changes,
            where: { col, value: this.cleanValue(val) }
        };
    }
    parseDelete(sql) {
        const match = /DELETE\s+FROM\s+(\w+)\s+WHERE\s+(\w+)\s*=\s*(.+)\s*;?/i.exec(sql);
        if (!match)
            throw new Error(`Invalid DELETE syntax: ${sql}`);
        const [, table, col, val] = match;
        return {
            kind: 'DELETE',
            table,
            where: { col, value: this.cleanValue(val) }
        };
    }
    cleanValue(v) {
        if (v == null)
            throw new Error('Invalid WHERE clause');
        return v
            .trim()
            .replace(/^'(.*)'$/, '$1')
            .replace(/^"(.*)"$/, '$1');
    }
    splitValues(input) {
        const values = [];
        let current = '';
        let inString = false;
        for (let i = 0; i < input.length; i++) {
            const ch = input[i];
            if (ch === "'" && input[i - 1] !== '\\') {
                inString = !inString;
                continue;
            }
            if (ch === ',' && !inString) {
                values.push(current.trim());
                current = '';
                continue;
            }
            current += ch;
        }
        if (current)
            values.push(current.trim());
        return values.map(v => v.replace(/^'(.*)'$/, '$1'));
    }
    splitAssignments(input) {
        const parts = [];
        let current = '';
        let inString = false;
        for (let i = 0; i < input.length; i++) {
            const ch = input[i];
            if (ch === "'" && input[i - 1] !== '\\') {
                inString = !inString;
                current += ch;
                continue;
            }
            if (ch === ',' && !inString) {
                parts.push(current.trim());
                current = '';
                continue;
            }
            current += ch;
        }
        if (current)
            parts.push(current.trim());
        return parts;
    }
}

class SqlEngineService {
    db;
    parser = new SqlParser();
    constructor(db) {
        this.db = db;
    }
    async execute(sql) {
        const ast = this.parser.parse(sql);
        return this.executeAst(ast);
    }
    async executeAst(stmt) {
        switch (stmt.kind) {
            case 'CREATE_DATABASE':
                await this.db.createDatabase(stmt.name);
                return `Database ${stmt.name} created`;
            case 'DROP_DATABASE':
                await this.db.dropDatabase(stmt.name);
                return `Database ${stmt.name} dropped`;
            case 'SHOW_DATABASES':
                return await this.db.listDatabases();
            case 'USE_DATABASE':
                await this.db.useDatabase(stmt.name);
                return `Using database ${stmt.name}`;
            case 'SHOW_TABLES': {
                const tables = await this.db.listTables();
                return {
                    type: 'TABLE_LIST',
                    tables
                };
            }
            case 'DROP_TABLE': {
                await this.db.dropTable(stmt.table);
                return `Table ${stmt.table} dropped`;
            }
            case 'ALTER_TABLE': {
                const action = stmt.actions[0];
                if (action.type === 'RENAME_TABLE') {
                    const table = await this.db.renameTable(stmt.table, action.to);
                    return {
                        type: 'TABLE_SCHEMA',
                        table: table.name,
                        columns: table.columns
                    };
                }
                const table = await this.db.table(stmt.table);
                for (const a of stmt.actions) {
                    table.applyAlter(a);
                }
                this.db.persist(table.name);
                return {
                    type: 'TABLE_SCHEMA',
                    table: table.name,
                    columns: table.columns
                };
            }
            case 'CREATE_TABLE': {
                await this.db.createTable(stmt.table, stmt.columns.map(c => ({
                    name: c.name,
                    type: c.datatype,
                    primary: c.primary,
                    unique: c.unique
                })));
                const table = await this.db.table(stmt.table);
                return {
                    type: 'TABLE_SCHEMA',
                    table: table.name,
                    columns: table.columns
                };
            }
            case 'INSERT': {
                const row = {};
                const table = await this.db.table(stmt.table);
                table.columns.forEach((c, i) => row[c.name] = stmt.values[i]);
                const updated = await this.db.insert(stmt.table, row);
                return {
                    type: 'TABLE_DATA',
                    table: updated.name,
                    rows: updated.rows
                };
            }
            case 'SELECT': {
                const table = await this.db.select(stmt.table, stmt.where, stmt.columns);
                return {
                    type: 'TABLE_DATA',
                    table: table.name,
                    rows: table.rows
                };
            }
            case 'UPDATE': {
                const updated = await this.db.update(stmt.table, stmt.where, stmt.set);
                return {
                    type: 'TABLE_DATA',
                    table: updated.name,
                    rows: updated.rows
                };
            }
            case 'DELETE': {
                const updated = await this.db.delete(stmt.table, stmt.where);
                return {
                    type: 'TABLE_DATA',
                    table: updated.name,
                    rows: updated.rows
                };
            }
        }
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.3.16", ngImport: i0, type: SqlEngineService, deps: [{ token: DatabaseService }], target: i0.ɵɵFactoryTarget.Injectable });
    static ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "20.3.16", ngImport: i0, type: SqlEngineService, providedIn: 'root' });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.3.16", ngImport: i0, type: SqlEngineService, decorators: [{
            type: Injectable,
            args: [{
                    providedIn: 'root',
                }]
        }], ctorParameters: () => [{ type: DatabaseService }] });

class PwaDb {
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.3.16", ngImport: i0, type: PwaDb, deps: [], target: i0.ɵɵFactoryTarget.Component });
    static ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "20.3.16", type: PwaDb, isStandalone: true, selector: "lib-pwa-db", ngImport: i0, template: `
    <p>
      pwa-db works!
    </p>
  `, isInline: true, styles: [""] });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.3.16", ngImport: i0, type: PwaDb, decorators: [{
            type: Component,
            args: [{ selector: 'lib-pwa-db', imports: [], template: `
    <p>
      pwa-db works!
    </p>
  ` }]
        }] });

/*
 * Public API Surface of pwa-db
 * Author: benkatiku.netlify.app
 */
// core

/**
 * Generated bundle index. Do not edit.
 */

export { DatabaseService, IndexedDbService, PwaDb, SqlEngineService, SqlParser, Table };
//# sourceMappingURL=pwa-db.mjs.map
