import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260312154721 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "invoice" ("id" text not null, "display_id" serial, "resource_id" text not null, "type" text check ("type" in ('debit', 'credit', 'void')) not null, "pdf_url" text null, "parent_invoice_id" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "invoice_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_invoice_parent_invoice_id" ON "invoice" ("parent_invoice_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_invoice_deleted_at" ON "invoice" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "invoice" add constraint "invoice_parent_invoice_id_foreign" foreign key ("parent_invoice_id") references "invoice" ("id") on update cascade on delete set null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "invoice" drop constraint if exists "invoice_parent_invoice_id_foreign";`);

    this.addSql(`drop table if exists "invoice" cascade;`);
  }

}
