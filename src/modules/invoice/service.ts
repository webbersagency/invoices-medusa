import {MedusaService} from "@medusajs/framework/utils"
import Invoice from "./models/invoice"
import {z} from "@medusajs/framework/zod"
import {Content} from "pdfmake/interfaces"
import {SUPPORTED_LOCALES} from "../../i18n"

type AddressFormatter = (data: Record<string, string>) => string

const addressFormatterSchema = z.custom<AddressFormatter>(
  (value): value is AddressFormatter => typeof value === "function",
  {
    message: "address must be a function",
  }
)

export const moduleOptionsSchema = z.object({
  defaultLocale: z.enum(SUPPORTED_LOCALES).optional(),
  addressInfo: z.object({
    companyLogo: z.string().optional(),
    companyLogoWidth: z.number().optional(),
    companyName: z.string(),
    address: addressFormatterSchema,
    cocNumber: z.string(),
    vatNumber: z.string(),
    iban: z.string(),
    email: z.string(),
  }),
  colors: z
    .object({
      background: z.string().optional(),
      text: z.string().optional(),
    })
    .optional(),
  header: z.custom<Content>().optional(),
  footer: z.custom<Content>().optional(),
})

export type ModuleOptions = z.infer<typeof moduleOptionsSchema>

class Service extends MedusaService({Invoice}) {
  protected options_: ModuleOptions

  constructor(container, options: ModuleOptions) {
    super(container, options)
    this.options_ = options
  }

  getOptions(): ModuleOptions {
    return this.options_
  }
}

export default Service
