import {createStep, StepResponse} from "@medusajs/framework/workflows-sdk"
import {INVOICE_MODULE} from "../../modules/invoice"
import InvoiceModuleService from "../../modules/invoice/service"
import {Modules} from "@medusajs/framework/utils"

type ReplaceInvoicePdfStepInput = {
  invoice_id: string
  file_name: string
  data: string
}

export const replaceInvoicePdfStep = createStep(
  "replace-invoice-pdf-step",
  async (
    {invoice_id, file_name, data}: ReplaceInvoicePdfStepInput,
    {container}
  ) => {
    const fileModuleService = container.resolve(Modules.FILE)
    const invoiceModule: InvoiceModuleService = container.resolve(INVOICE_MODULE)

    const invoice = await invoiceModule.retrieveInvoice(invoice_id)
    const previousFileId = invoice.pdf_url ?? null

    const [file] = await fileModuleService.createFiles([
      {
        filename: `invoices/${file_name}`,
        mimeType: "application/pdf",
        content: data,
        access: "private",
      },
    ])

    await invoiceModule.updateInvoices({id: invoice_id, pdf_url: file.id})

    return new StepResponse(file.id, {
      invoice_id,
      previous_file_id: previousFileId,
    })
  },
  async (
    rollbackData:
      | {invoice_id: string; previous_file_id: string | null}
      | undefined,
    {container}
  ) => {
    if (!rollbackData) return
    const {invoice_id, previous_file_id} = rollbackData

    const invoiceModule: InvoiceModuleService = container.resolve(INVOICE_MODULE)

    await invoiceModule.updateInvoices({
      id: invoice_id,
      pdf_url: previous_file_id,
    })
  }
)
