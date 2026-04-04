import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260403000001 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_invoice_resource_id" ON "invoice" ("resource_id") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_invoice_type" ON "invoice" ("type") WHERE deleted_at IS NULL;`
    );
  }

  override async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "IDX_invoice_resource_id";`);
    this.addSql(`DROP INDEX IF EXISTS "IDX_invoice_type";`);
  }
}
