import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {generateInvoicePdfStep} from "./steps/generate-invoice-pdf-step"
import {replaceInvoicePdfStep} from "./steps/replace-invoice-pdf-step"

type RefreshInvoicePdfWorkflowInput = {
  order_id: string
  invoice_id: string
}

export const refreshInvoicePdfWorkflow = createWorkflow(
  "refresh-invoice-pdf",
  (input: RefreshInvoicePdfWorkflowInput) => {
    const pdf = generateInvoicePdfStep({
      order_id: input.order_id,
      invoice_id: input.invoice_id,
    })

    const fileId = replaceInvoicePdfStep(
      transform({pdf, input}, ({pdf, input}) => ({
        invoice_id: input.invoice_id,
        file_name: pdf.fileName,
        data: pdf.data,
      }))
    )

    return new WorkflowResponse({file_id: fileId})
  }
)
