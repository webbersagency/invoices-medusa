import {SubscriberArgs, SubscriberConfig} from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  PaymentEvents,
} from "@medusajs/framework/utils"
import invoiceOrderLink from "../links/invoice-order"
import {createCreditInvoiceWorkflow} from "../workflows/create-credit-invoice"
import {RefundDTO} from "@medusajs/types"

type InvoiceLink = {
  invoice_id: string
  created_at: Date
  invoice?: {resource_id: string; type: string}
}

export default async function paymentRefundedInvoiceHandler({
  event: {data},
  container,
}: SubscriberArgs<{id: string}>) {
  const logger = container.resolve("logger")
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  try {
    // Traverse payment → payment_collection → order
    const {
      data: [payment],
    } = await query.graph({
      entity: "payment",
      fields: ["payment_collection.order.id", "refunds.*"],
      filters: {id: data.id},
    })

    const orderId: string | undefined = payment?.payment_collection?.order?.id

    if (!orderId) {
      logger.info(`[invoice] No order found for payment ${data.id}, skipping`)
      return
    }

    // Only refund credit lines warrant a credit invoice.
    const refunds: RefundDTO[] = payment?.refunds ?? []

    const {data: links} = await query.graph({
      entity: invoiceOrderLink.entryPoint,
      fields: [
        "invoice_id",
        "created_at",
        "invoice.resource_id",
        "invoice.type",
      ],
      filters: {order_id: orderId},
    })

    const parentInvoice: InvoiceLink | undefined = links.find(
      (l: InvoiceLink) => l.invoice?.type === "debit"
    )

    // A credit invoice is only created after the debit invoice has been created.
    if (!parentInvoice) {
      return
    }

    for (const refund of refunds) {
      const alreadyExists = links.some(
        (l: InvoiceLink) => l.invoice?.resource_id === refund.id
      )

      // Create a credit invoice for each credit line that hasn't been invoiced yet.
      if (!alreadyExists) {
        await createCreditInvoiceWorkflow(container).run({
          input: {
            order_id: orderId,
            parent_invoice_id: parentInvoice.invoice_id,
            resource_id: refund.id,
          },
        })

        logger.info(
          `[invoice] Created credit invoice(s) for order ${orderId} - ${refund.id}`
        )
      }
    }
  } catch (error) {
    logger.error(
      `[invoice] Failed to create credit invoice for payment ${data.id}: ${error.message}`
    )
  }
}

export const config: SubscriberConfig = {
  event: PaymentEvents.REFUNDED,
}
