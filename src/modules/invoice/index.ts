import {Module} from "@medusajs/framework/utils"
import Service from "./service"
import validateLoader from "./loaders/validate"

export const INVOICE_MODULE = "invoice"

export default Module(INVOICE_MODULE, {
  service: Service,
  loaders: [validateLoader],
})
