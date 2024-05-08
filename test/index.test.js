import assert, { strictEqual, match } from "assert";
import { describe, test } from "mocha";
import { getAccounts } from "@tableland/local";
import { Database } from "@tableland/sdk";

describe("index", function () {
  this.timeout(10000);

  const accounts = getAccounts("http://127.0.0.1:8545");
  const signer = accounts[1];
  const db = new Database({ signer, autoWait: true });

  test("create", async function () {
    const tablePrefix = "my_table";
    const sql = `CREATE TABLE ${tablePrefix} (id integer, val text);`;

    const { meta } = await db.prepare(sql).all();
    const tableName = meta.txn?.name ?? "";
    match(tableName, new RegExp(`^${tablePrefix}_31337_\\d+$`));

    await meta.txn?.wait();
  });

  describe("query", function () {
    let tableName;
    const tablePrefix = "my_table";

    this.beforeAll(async function () {
      const sql = `CREATE TABLE ${tablePrefix} (id integer, val text);`;
      const { meta: create } = await db.prepare(sql).all();
      tableName = create.txn?.name ?? "";
      await create.txn?.wait();
    });

    test("insert", async function () {
      const sql = `INSERT INTO ${tableName} VALUES (1, 'tableland');`;
      const { meta } = await db.prepare(sql).run();
      assert(meta.txn?.transactionHash != null);
      strictEqual(meta.txn.name, tableName);

      await meta.txn?.wait();
    });

    test("update", async function () {
      const sql = `UPDATE ${tableName} SET val = 'web3' WHERE id = 1;`;
      const { meta } = await db.prepare(sql).run();
      assert(meta.txn?.transactionHash != null);
      strictEqual(meta.txn.name, tableName);

      await meta.txn?.wait();
    });

    test("delete", async function () {
      const sql = `DELETE FROM ${tableName} WHERE id = 1;`;
      const { meta } = await db.prepare(sql).run();
      assert(meta.txn?.transactionHash != null);
      strictEqual(meta.txn.name, tableName);

      await meta.txn?.wait();
    });

    test("read", async function () {
      const { meta } = await db
        .prepare(`INSERT INTO ${tableName} VALUES (1, 'tableland');`)
        .run();
      await meta.txn?.wait();

      const { results } = await db.prepare(`SELECT * FROM ${tableName};`).all();
      strictEqual(results[0].id, 1);
      strictEqual(results[0].val, "tableland");
    });
  });
});
