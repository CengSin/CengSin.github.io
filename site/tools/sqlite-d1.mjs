import { DatabaseSync } from "node:sqlite";

export function sqliteD1(path) {
  const connection = new DatabaseSync(path);
  connection.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;");
  const prepare = (sql, values = []) => ({
    bind: (...args) => prepare(sql, args),
    async first() { return connection.prepare(sql).get(...values) || null; },
    async all() { return { results: connection.prepare(sql).all(...values) }; },
    async run() { return connection.prepare(sql).run(...values); },
  });
  return {
    prepare,
    async batch(statements) {
      connection.exec("BEGIN");
      try { const results = []; for (const s of statements) results.push(await s.run()); connection.exec("COMMIT"); return results; }
      catch (e) { connection.exec("ROLLBACK"); throw e; }
    },
    exec: (sql) => connection.exec(sql),
    close: () => connection.close(),
  };
}
