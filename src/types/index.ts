export interface InvoiceDTO {
  id: string
  display_id: number
  resource_id: string
  type: "debit" | "credit" | "void"
  parent_invoice?: InvoiceDTO | null
  metadata?: Record<string, unknown> | null
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
}
