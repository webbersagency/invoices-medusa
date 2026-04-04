import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {generateInvoicePdfStep} from "./steps/generate-invoice-pdf-step"

type GenerateInvoicePdfWorkflowInput = {
  order_id: string
  invoice_id?: string
}

export const generateInvoicePdfWorkflow = createWorkflow(
  "generate-invoice-pdf-workflow",
  (input: GenerateInvoicePdfWorkflowInput) => {
    const pdf = generateInvoicePdfStep(input)
    return new WorkflowResponse(pdf)
  }
)
