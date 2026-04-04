import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {createRemoteLinkStep} from "@medusajs/medusa/core-flows"
import {Modules} from "@medusajs/framework/utils"
import {INVOICE_MODULE} from "../modules/invoice"
import {createInvoiceStep} from "./steps/create-invoice-step"
import {generateInvoicePdfStep} from "./steps/generate-invoice-pdf-step"
import {uploadInvoicePdfStep} from "./steps/upload-invoice-pdf-step"

type CreateCreditInvoiceWorkflowInput = {
  order_id: string
  resource_id: string
  // Optional: ID of the original invoice this credit invoice offsets.
  // May be absent if no invoice was found for the order.
  parent_invoice_id?: string
}

export const createCreditInvoiceWorkflow = createWorkflow(
  "create-credit-invoice",
  function (input: CreateCreditInvoiceWorkflowInput) {
    const invoice = createInvoiceStep({
      type: "credit",
      resource_id: input.resource_id,
      parent_invoice_id: input.parent_invoice_id,
    })

    // Link credit invoice to the return's order via Medusa's link layer.
    const linkData = transform({invoice, input}, ({invoice, input}) => [
      {
        [INVOICE_MODULE]: {invoice_id: invoice.id},
        [Modules.ORDER]: {order_id: input.order_id},
      },
    ])

    createRemoteLinkStep(linkData)

    // Generate PDF after the link is established so query.graph can resolve invoices.*
    const pdf = generateInvoicePdfStep(
      transform({invoice, input}, ({invoice, input}) => ({
        order_id: input.order_id,
        invoice_id: invoice.id,
      }))
    )

    uploadInvoicePdfStep(
      transform({pdf, invoice}, ({pdf, invoice}) => ({
        invoice_id: invoice.id,
        file_name: pdf.fileName,
        data: pdf.data,
      }))
    )

    return new WorkflowResponse({invoice})
  }
)
