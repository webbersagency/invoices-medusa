import {defineLink} from "@medusajs/framework/utils"
import OrderModule from "@medusajs/medusa/order"
import InvoiceModule from "../modules/invoice"

export default defineLink(
  {
    linkable: InvoiceModule.linkable.invoice,
    isList: true,
  },
  OrderModule.linkable.order,
  {
    database: {
      table: "invoice_order",
    },
  }
)
