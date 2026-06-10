import {createStep, StepResponse} from "@medusajs/framework/workflows-sdk"
import PdfGenerator, {OrderWithInvoices} from "../../core/classes/pdf-generator"
import {INVOICE_MODULE} from "../../modules/invoice"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import InvoiceModuleService from "../../modules/invoice/service"
import merge from "lodash.merge"

type GenerateInvoicePdfStepInput = {
  order_id: string
  invoice_id?: string
}

export const generateInvoicePdfStep = createStep(
  "generate-invoice-pdf-step",
  async ({order_id, invoice_id}: GenerateInvoicePdfStepInput, {container}) => {
    const invoiceModuleService: InvoiceModuleService =
      container.resolve(INVOICE_MODULE)
    const orderModuleService = container.resolve(Modules.ORDER)
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    const options = invoiceModuleService.getOptions()

    const pdfGenerator = new PdfGenerator()

    const order = await orderModuleService.retrieveOrder(order_id, {
      select: ["*", "total", "items"],
    })

    const {
      data: [orderWithRelations],
    } = await query.graph(
      {
        entity: "order",
        fields: [
          "id",
          "shipping_address.*",
          "billing_address.*",
          "customer.groups.*",
          "items.*",
          "items.variant.ean",
          "items.variant.inventory_items.*",
          "items.variant.inventory_items.inventory.*",
          "items.tax_lines.*",
          "items.adjustments.*",
          "shipping_methods.*",
          "shipping_methods.tax_lines.*",
          "invoices.*",
          "invoices.parent_invoice.display_id",
          "payment_collections.*",
          "payment_collections.payments.*",
          "payment_collections.payments.refunds.*",
        ],
        filters: {
          id: order_id,
        },
      },
      {
        throwIfKeyNotFound: true,
      }
    )

    const mergedOrder = merge(
      order,
      orderWithRelations
    ) as unknown as OrderWithInvoices

    // Find the invoice to generate the PDF for. If invoice_id is passed we need to find that match, otherwise we need to
    // find the debit invoice.
    const invoice = mergedOrder.invoices.find((i) =>
      !invoice_id ? i.type === "debit" : i.id === invoice_id
    )

    if (!invoice) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, "Invoice not found")
    }

    return new StepResponse({
      fileName: `invoice-${invoice.display_id}.pdf`,
      data:
        invoice.type === "credit"
          ? await pdfGenerator.createCreditInvoice(
              mergedOrder,
              invoice,
              options
            )
          : await pdfGenerator.createInvoice(mergedOrder, options),
    })
  }
)
