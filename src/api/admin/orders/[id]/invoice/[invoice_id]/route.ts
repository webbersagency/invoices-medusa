import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import {Modules} from "@medusajs/framework/utils"
import {generateInvoicePdfWorkflow} from "../../../../../../workflows/generate-invoice-pdf"
import {INVOICE_MODULE} from "../../../../../../modules/invoice"
import InvoiceModuleService from "../../../../../../modules/invoice/service"

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const {id: orderId, invoice_id: invoiceId} = req.params

  const invoiceModule: InvoiceModuleService = req.scope.resolve(INVOICE_MODULE)
  const invoice = await invoiceModule.retrieveInvoice(invoiceId)

  if (invoice.pdf_url) {
    const fileModuleService = req.scope.resolve(Modules.FILE)
    const file = await fileModuleService.retrieveFile(invoice.pdf_url)
    return res.redirect(file.url)
  }

  // Fallback: generate on-demand for invoices created before storage upload was introduced
  const {result} = await generateInvoicePdfWorkflow(req.scope).run({
    input: {
      order_id: orderId,
      invoice_id: invoiceId,
    },
  })

  res.contentType("application/pdf")
  res.attachment(result.fileName)
  res.send(Buffer.from(result.data, "base64"))
}
