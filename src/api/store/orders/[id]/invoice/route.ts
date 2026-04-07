import {AuthenticatedMedusaRequest, MedusaResponse} from "@medusajs/framework/http"
import {generateInvoicePdfWorkflow} from "../../../../../workflows/generate-invoice-pdf"
import {ContainerRegistrationKeys, MedusaError, Modules} from "@medusajs/framework/utils"
import {InvoiceDTO} from "../../../../../types"

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const {id} = req.params
  const customerId = req.auth_context.actor_id

  const orderModuleService = req.scope.resolve(Modules.ORDER)
  const order = await orderModuleService.retrieveOrder(id, {select: ["id", "customer_id"]})

  if (!order.customer_id || order.customer_id !== customerId) {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Unauthorized")
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const {data: [orderData]} = await query.graph({
    entity: "order",
    fields: ["invoices.*"],
    filters: {id},
  })

  const debitInvoice = orderData?.invoices?.find((inv: {type: string}) => inv.type === "debit") as InvoiceDTO | undefined

  if (debitInvoice?.pdf_url) {
    const fileModuleService = req.scope.resolve(Modules.FILE)
    const stream = await fileModuleService.getDownloadStream(debitInvoice.pdf_url)
    res.contentType("application/pdf")
    res.attachment(`invoice-${debitInvoice.display_id}.pdf`)
    return stream.pipe(res)
  }

  // Fallback: generate on-demand for invoices created before storage upload was introduced
  const {result} = await generateInvoicePdfWorkflow(req.scope).run({
    input: {
      order_id: id,
    },
  })

  res.contentType("application/pdf")
  res.attachment(result.fileName)
  res.send(Buffer.from(result.data, "base64"))
}
