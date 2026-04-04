import pdfmake from "pdfmake"
import packingSlipContent from "./templates/packing-slip-content"
import base from "./templates/base"
import {OrderDTO, PaymentCollectionDTO} from "@medusajs/types"
import invoiceContent from "./templates/invoice-content"
import {InvoiceDTO} from "../../../types"
import {ModuleOptions} from "../../../modules/invoice/service"
import creditInvoiceContent from "./templates/credit-invoice-content"

pdfmake.addFonts({
  Helvetica: {
    normal: "Helvetica",
    bold: "Helvetica-Bold",
    italics: "Helvetica-Oblique",
    bolditalics: "Helvetica-BoldOblique",
  },
})

export type OrderWithInvoices = OrderDTO & {invoices: InvoiceDTO[]} & {
  payment_collections: PaymentCollectionDTO[]
}

export default class PdfGenerator {

  createPackingSlip = async (
    order: OrderDTO,
    options: ModuleOptions
  ): Promise<string> => {
    const content = await packingSlipContent(order, options)
    return pdfmake.createPdf(base(content, options)).getBase64()
  }

  createInvoice = async (
    order: OrderWithInvoices,
    options: ModuleOptions
  ): Promise<string> => {
    const content = await invoiceContent(order, options)
    return pdfmake.createPdf(base(content, options)).getBase64()
  }

  createCreditInvoice = async (
    order: OrderWithInvoices,
    invoice: InvoiceDTO,
    options: ModuleOptions
  ): Promise<string> => {
    const content = await creditInvoiceContent(order, invoice, options)
    return pdfmake.createPdf(base(content, options)).getBase64()
  }
}
