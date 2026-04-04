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

type CreateInvoiceWorkflowInput = {
  order_id: string
}

export const createInvoiceWorkflow = createWorkflow(
  "create-invoice",
  function (input: CreateInvoiceWorkflowInput) {
    const invoice = createInvoiceStep({
      type: "debit",
      resource_id: input.order_id,
    })

    // Link invoice to order via Medusa's link layer — never as a FK column on the model.
    // Link order matches defineLink(InvoiceModule.linkable.invoice, OrderModule.linkable.order):
    // invoice side first, then order side.
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
