import {createStep, StepResponse} from "@medusajs/framework/workflows-sdk"
import {INVOICE_MODULE} from "../../modules/invoice"
import InvoiceModuleService from "../../modules/invoice/service"
import {Modules} from "@medusajs/framework/utils"

type UploadInvoicePdfStepInput = {
  invoice_id: string
  file_name: string
  data: string
}

export const uploadInvoicePdfStep = createStep(
  "upload-invoice-pdf-step",
  async ({invoice_id, file_name, data}: UploadInvoicePdfStepInput, {container}) => {
    const fileModuleService = container.resolve(Modules.FILE)
    const invoiceModule: InvoiceModuleService = container.resolve(INVOICE_MODULE)

    const [file] = await fileModuleService.createFiles([
      {
        filename: `invoices/${Date.now()}-${file_name}`,
        mimeType: "application/pdf",
        content: data,
        access: "private",
      },
    ])

    await invoiceModule.updateInvoices({id: invoice_id, pdf_url: file.id})

    return new StepResponse(file.id, {invoice_id, file_id: file.id})
  },
  async (
    rollbackData: {invoice_id: string; file_id: string} | undefined,
    {container}
  ) => {
    if (!rollbackData) return
    const {invoice_id, file_id} = rollbackData

    const fileModuleService = container.resolve(Modules.FILE)
    const invoiceModule: InvoiceModuleService = container.resolve(INVOICE_MODULE)

    await fileModuleService.deleteFiles([file_id])
    await invoiceModule.updateInvoices({id: invoice_id, pdf_url: null})
  }
)
