import {createStep, StepResponse} from "@medusajs/framework/workflows-sdk"
import {INVOICE_MODULE} from "../../modules/invoice"
import InvoiceModuleService from "../../modules/invoice/service"

type CreateInvoiceStepInput = {
  type: "debit" | "credit"
  resource_id: string
  parent_invoice_id?: string
}

export const createInvoiceStep = createStep(
  "create-invoice-step",
  async (input: CreateInvoiceStepInput, {container}) => {
    const invoiceModule: InvoiceModuleService =
      container.resolve(INVOICE_MODULE)

    const invoice = await invoiceModule.createInvoices({
      type: input.type,
      resource_id: input.resource_id,
      ...(input.parent_invoice_id
        ? {parent_invoice_id: input.parent_invoice_id}
        : {}),
    })

    return new StepResponse(invoice, invoice.id)
  },
  // Compensation: void instead of delete to preserve the numbering sequence.
  // Deleting would create a gap in display_id, which is undesirable.
  async (invoiceId: string | undefined, {container}) => {
    if (!invoiceId) return
    const invoiceModule: InvoiceModuleService =
      container.resolve(INVOICE_MODULE)
    await invoiceModule.updateInvoices({id: invoiceId, type: "void"})
  }
)
