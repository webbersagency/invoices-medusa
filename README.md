# @webbers/invoices-medusa

A Medusa v2 plugin that automatically generates sequential PDF invoices for orders and credit notes for refunds. PDFs are uploaded to your private file storage bucket and served to customers and admins via presigned URLs.

## Requirements

- Medusa `>= 2.4.0`
- A configured [File Module Provider](https://docs.medusajs.com/resources/infrastructure-modules/file) (e.g. S3/R2) with private bucket support

## Installation

```bash
pnpm add @webbers/invoices-medusa
```

## Configuration

Register the plugin in `medusa-config.ts`:

```ts
import { defineConfig } from "@medusajs/framework/utils"

export default defineConfig({
  plugins: [
    {
      resolve: "@webbers/invoices-medusa",
      options: {
        // Optional: locale to fall back to when order.metadata.locale is absent
        // or not a supported value. Defaults to "nl".
        defaultLocale: "en",

        addressInfo: {
          // Optional: SVG string or base64 data URL shown in the default header
          companyLogo: "<svg>...</svg>",
          // Optional: rendered width of the logo in points (default: 110)
          companyLogoWidth: 110,

          companyName: "Acme B.V.",

          // Receives the i18n countries object for the resolved locale so you
          // can include a translated country name in the address block.
          address: (countries) =>
            `Streetname 1\n1234 AB Amsterdam, ${countries.nl}`,

          cocNumber: "12345678",
          vatNumber: "NL123456789B01",
          iban: "NL00BANK0123456789",
          email: "billing@example.com",
        },

        // Optional: accent colors used in table headers
        colors: {
          background: "#004534", // header cell fill (default: #000)
          text: "#ffffff",       // header cell text (default: #fff)
        },

        // Optional: pdfmake Content rendered as the page header.
        // Overrides the default logo header when provided.
        header: {
          table: {
            widths: ["*"],
            body: [[{ text: "Acme B.V.", fontSize: 18, alignment: "center" }]],
          },
          layout: "noBorders",
        },

        // Optional: pdfmake Content rendered as the page footer.
        footer: {
          table: {
            widths: ["*"],
            body: [[{ text: "acme.com", alignment: "center" }]],
          },
          layout: "noBorders",
        },
      },
    },
  ],
})
```

### Configuration reference

| Option | Type | Required | Description |
|---|---|---|---|
| `defaultLocale` | `Locale` | No | Fallback locale when `order.metadata.locale` is absent or invalid. Defaults to `"nl"`. |
| `addressInfo.companyName` | `string` | Yes | Company name shown on the invoice. |
| `addressInfo.address` | `(countries: Record<string, string>) => string` | Yes | Function returning the company address. Receives the i18n country name map for the resolved locale. |
| `addressInfo.cocNumber` | `string` | Yes | Chamber of Commerce number. |
| `addressInfo.vatNumber` | `string` | Yes | VAT registration number. |
| `addressInfo.iban` | `string` | Yes | Bank account number. |
| `addressInfo.email` | `string` | Yes | Billing contact e-mail. |
| `addressInfo.companyLogo` | `string` | No | SVG string or data URL used in the default header. |
| `addressInfo.companyLogoWidth` | `number` | No | Rendered logo width in points. |
| `colors.background` | `string` | No | Table header fill color (CSS hex). |
| `colors.text` | `string` | No | Table header text color (CSS hex). |
| `header` | `Content` | No | pdfmake content block rendered as page header. Replaces the default logo header. |
| `footer` | `Content` | No | pdfmake content block rendered as page footer. |

## How it works

### Invoice lifecycle

1. **Fulfillment created** — the `order.fulfillment_created` subscriber fires `createInvoiceWorkflow`, which:
   - Creates a **debit** invoice record with an auto-incremented `display_id`
   - Links it to the order via the `invoice_order` link table
   - Generates the PDF and uploads it to the **private** storage bucket
   - Stores the file ID in `invoice.pdf_url`
2. **Refund processed** — `createCreditInvoiceWorkflow` follows the same steps for a **credit** invoice, referencing the original debit invoice as its parent.
3. **Download requested** — the API route resolves `invoice.pdf_url` to a presigned download URL via `fileModuleService.retrieveFile()` and redirects the client. Invoices without a stored PDF (created before this feature) are generated on-demand as a fallback.

### Invoice numbering

`display_id` is a PostgreSQL auto-increment sequence. Voided invoices (created by workflow compensation on failure) preserve their sequence number to avoid gaps.

### Localization

The PDF language is determined by `order.metadata.locale`. The value is validated against the list of supported locales; if it is absent or unrecognised, `defaultLocale` from the plugin config is used.

Supported locales:

| Value | Language |
|---|---|
| `nl` | Dutch |
| `nl-be` | Dutch (Belgium) — uses Dutch translations |
| `en` | English |
| `de` | German |
| `fr` | French |
| `it` | Italian |

Set the locale on an order at creation time:

```ts
await orderModuleService.updateOrders(orderId, {
  metadata: { locale: "en" },
})
```

## API routes

### Admin

```
GET /admin/orders/:id/invoice/:invoice_id
```

Requires admin authentication. Redirects to a presigned download URL for the invoice PDF.

### Store

```
GET /store/orders/:id/invoice
```

Requires customer authentication. Returns the debit invoice PDF for the order. The order must belong to the authenticated customer.

## Workflows

The workflows can be called directly from your own subscribers, jobs, or API routes.

### `createInvoiceWorkflow`

Creates a debit invoice, links it to an order, and generates + uploads the PDF.

```ts
import { createInvoiceWorkflow } from "@webbers/invoices-medusa/workflows"

await createInvoiceWorkflow(container).run({
  input: { order_id: "order_01J..." },
})
```

### `createCreditInvoiceWorkflow`

Creates a credit invoice for a refund.

```ts
import { createCreditInvoiceWorkflow } from "@webbers/invoices-medusa/workflows"

await createCreditInvoiceWorkflow(container).run({
  input: {
    order_id: "order_01J...",
    resource_id: "refund_01J...",      // refund ID used as resource_id
    parent_invoice_id: "inv_01J...",   // optional: the debit invoice this offsets
  },
})
```

### `generateInvoicePdfWorkflow`

Generates an invoice PDF on-demand and returns it as a base64 string. Useful for attaching to notification emails.

```ts
import { generateInvoicePdfWorkflow } from "@webbers/invoices-medusa/workflows"

const { result } = await generateInvoicePdfWorkflow(container).run({
  input: {
    order_id: "order_01J...",
    invoice_id: "inv_01J...", // optional; omit to generate the debit invoice
  },
})

// result.fileName  — e.g. "invoice-42.pdf"
// result.data      — base64-encoded PDF
```

## Backfill script

To generate and upload PDFs for invoices created before file storage was introduced:

```bash
# Dry run (default) — shows what would be processed
pnpm medusa exec ./src/scripts/backfill-invoice-pdf-urls.ts

# Execute
pnpm medusa exec ./src/scripts/backfill-invoice-pdf-urls.ts -- dry_run=false

# Smaller batches if memory is a concern
pnpm medusa exec ./src/scripts/backfill-invoice-pdf-urls.ts -- dry_run=false batch_size=10
```
