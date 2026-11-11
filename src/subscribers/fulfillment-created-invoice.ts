import {SubscriberArgs, SubscriberConfig} from "@medusajs/framework"
import {ContainerRegistrationKeys} from "@medusajs/framework/utils"
import invoiceOrderLink from "../links/invoice-order"
import {INVOICE_MODULE} from "../modules/invoice"
import InvoiceModuleService from "../modules/invoice/service"
import {createInvoiceWorkflow} from "../workflows/create-invoice"

type FulfillmentCreatedData = {
  order_id: string
  fulfillment_id: string
  no_notification: boolean
}

export default async function fulfillmentCreatedInvoiceHandler({
  event: {data},
  container,
}: SubscriberArgs<FulfillmentCreatedData>) {
  const logger = container.resolve("logger")
  const {order_id} = data

  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    // Guard: only create one invoice per order — subsequent fulfillments (e.g.
    // partial shipments) must not generate a second invoice number.
    const {data: existing} = await query.graph({
      entity: invoiceOrderLink.entryPoint,
      fields: ["invoice_id"],
      filters: {order_id},
    })

    if (existing.length > 0) {
      logger.info(
        `[invoice] Invoice already exists for order ${order_id}, skipping`
      )
      return
    }

    const invoiceModuleService: InvoiceModuleService =
      container.resolve(INVOICE_MODULE)
    const {shouldInvoiceOrder} = invoiceModuleService.getOptions()

    if (shouldInvoiceOrder && !(await shouldInvoiceOrder(container, order_id))) {
      logger.info(
        `[invoice] Order ${order_id} is not invoiced automatically, skipping`
      )
      return
    }

    await createInvoiceWorkflow(container).run({
      input: {order_id},
    })

    logger.info(`[invoice] Created invoice for order ${order_id}`)
  } catch (error) {
    logger.error(
      `[invoice] Failed to create invoice for order ${order_id}: ${error.message}`
    )
  }
}

export const config: SubscriberConfig = {
  event: "order.fulfillment_created",
}
