import {Column, Content, TableCell} from "pdfmake/interfaces"
import {getI18nMessages, resolveLocale} from "../../../../i18n"
import formatLocaleAmount from "../../../../utils/format-locale-amount"
import {OrderWithInvoices} from "../index"
import {formatDate} from "date-fns"
import {ModuleOptions} from "../../../../modules/invoice/service"
import {InvoiceDTO} from "../../../../types"

const invoiceContent = async (
  order: OrderWithInvoices,
  invoice: InvoiceDTO,
  options: ModuleOptions
): Promise<Content> => {
  const locale = resolveLocale(order.metadata?.locale, options.defaultLocale)
  const t = getI18nMessages(locale)
  const fmt = (amount: number) =>
    formatLocaleAmount(amount, order.currency_code, locale)

  if (!order.billing_address || !order.shipping_address) {
    throw new Error("Billing and or shipping address is missing")
  }

  const formatExclVat = (order as any)?.items?.some(
    (i) => i.is_tax_inclusive === false
  )

  const refund = order.payment_collections
    ?.flatMap((pc) => pc.payments ?? [])
    .flatMap((payment) => payment.refunds ?? [])
    .find((r) => r.id === invoice.resource_id)

  if (!refund) {
    throw new Error("Refund is missing")
  }

  if (!invoice.parent_invoice) {
    throw new Error("Parent invoice is missing")
  }

  const taxRate = order.items?.[0]?.tax_lines?.[0]?.rate ?? 0
  const refundTaxAmount = (Number(refund.amount) / (100 + taxRate)) * taxRate

  return [
    {
      columns: [
        {
          stack: [
            {
              text: t.invoice.creditInvoice,
              width: "*",
              fontSize: 28,
              bold: true,
              margin: [0, 0, 0, 15],
            },
            {
              text: t.invoice.invoiceNumber,
              color: "#aaaaab",
              width: "*",
              fontSize: 11,
              margin: [0, 10, 0, 2],
            },
            {
              text: `#${invoice.display_id.toString().padStart(5, "0")}`,
              fontSize: 11,
              width: 110,
            },
            {
              columns: [
                {
                  stack: [
                    {
                      text: t.invoice.date,
                      color: "#aaaaab",
                      width: "*",
                      fontSize: 11,
                      margin: [0, 10, 0, 2],
                    },
                    {
                      text: formatDate(invoice.created_at, "dd-MM-yyyy"),
                      width: 110,
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          stack: [
            {
              key: t.invoice.address,
              value: options.addressInfo.companyName,
              valueProps: {
                bold: true,
              },
            },
            {
              key: "",
              value: options.addressInfo.address(t.countries),
            },
            {
              key: t.invoice.coc,
              value: options.addressInfo.cocNumber,
            },
            {
              key: t.invoice.vatNr,
              value: options.addressInfo.vatNumber,
            },
            ...(formatExclVat
              ? [
                  {
                    key: t.invoice.iban,
                    value: options.addressInfo.iban,
                  },
                ]
              : []),
            {
              key: t.invoice.email,
              value: options.addressInfo.email,
            },
          ].map(({key, value, valueProps}) => ({
            columns: [
              {
                text: key,
                color: "#aaaaab",
                width: "*",
                fontSize: 10,
                alignment: "right",
              },
              {
                text: value,
                fontSize: 10,
                width: 135,
                ...valueProps,
              },
            ],
          })),
        },
      ] as Column[],
    },
    {
      columns: [
        {
          text: t.invoice.billingAddress,
          color: "#aaaaab",
          fontSize: 11,
          margin: [0, 10, 0, 2],
        },
        {
          text: t.invoice.deliveryAddress,
          color: "#aaaaab",
          fontSize: 11,
          margin: [0, 10, 0, 2],
        },
      ],
    },
    {
      columns: [
        {
          text: `${order.billing_address.company ? `${order.billing_address.company} \n` : ""}${order.billing_address.first_name} ${order.billing_address.last_name} \n ${
            order.billing_address.address_1
          } ${!order.billing_address.address_2 ? "" : order.billing_address.address_2} \n ${
            order.billing_address.postal_code
          } ${order.billing_address.city} \n ${t.countries[order.billing_address.country_code!] ?? order.billing_address.country_code}
           \n\n E: ${order.email} \n T: ${order.shipping_address.phone} ${order.metadata?.po_number ? `\n PO-nummer: ${order.metadata.po_number}` : ""}`,
        },
        {
          text: `${order.shipping_address.company ? `${order.shipping_address.company} \n` : ""}${order.shipping_address.first_name} ${order.shipping_address.last_name} \n ${
            order.shipping_address.address_1
          } ${!order.shipping_address.address_2 ? "" : order.shipping_address.address_2} \n ${
            order.shipping_address.postal_code
          } ${order.shipping_address.city} \n ${t.countries[order.shipping_address.country_code!] ?? order.shipping_address.country_code}`,
        },
      ] as Column[],
    },
    "\n\n",
    {
      layout: {
        defaultBorder: false,
        hLineWidth: () => 1,
        vLineWidth: () => 0,
        hLineColor: () => "#aaa",
        paddingLeft: () => 5,
        paddingRight: () => 5,
        paddingTop: () => 0,
        paddingBottom: () => 0,
      },
      table: {
        headerRows: 1,
        widths: ["*", "auto"],
        body: [
          [
            {
              text: t.invoice.description,
              style: "tableHeader",
            },
            {
              text: t.invoice.total,
              style: "tableHeader",
              alignment: "right",
            },
          ],
          [
            {
              text: [
                {
                  text: `${t.invoice.creditInvoiceDescription} #${invoice.parent_invoice.display_id.toString().padStart(5, "0")}`,
                },
                ...(refund.note ? [{text: `\n- ${refund.note}`}] : []),
              ],
              style: "lineItemStyle",
              border: [false, false, false, true],
            },
            {
              stack: [
                {
                  text: fmt(
                    formatExclVat
                      ? -(Number(refund.amount) - refundTaxAmount)
                      : -Number(refund.amount)
                  ),
                  style: "priceStyle",
                  alignment: "right",
                },
              ],
              style: "lineItemStyle",
              border: [false, false, false, true],
            },
          ] as TableCell[],
        ],
      },
    },
    {
      layout: {
        defaultBorder: false,
        hLineWidth: () => 1,
        vLineWidth: () => 0,
        hLineColor: () => "#aaa",
        paddingLeft: () => 5,
        paddingRight: () => 5,
        paddingTop: () => 0,
        paddingBottom: () => 0,
      },
      table: {
        headerRows: 1,
        widths: ["*", "auto"],
        body: [
          ...(formatExclVat
            ? [
                [
                  {
                    text: t.invoice.totalExclVat,
                    border: [false, true, false, false],
                    margin: [0, 7, 0, 2],
                  },
                  {
                    text: fmt(-(Number(refund.amount) - refundTaxAmount)),
                    alignment: "right",
                    border: [false, true, false, false],
                    margin: [0, 7, 0, 2],
                  },
                ],
                [
                  {
                    text: `${t.invoice.vat} ${taxRate}%`,
                    border: false,
                    margin: [0, 2, 0, 5],
                  },
                  {
                    text: fmt(-refundTaxAmount),
                    alignment: "right",
                    border: false,
                    margin: [0, 2, 0, 5],
                  },
                ],
                [
                  {
                    text: t.invoice.totalInclVat,
                    bold: true,
                    fontSize: 12,
                    border: false,
                    margin: [0, 2, 0, 5],
                  },
                  {
                    text: fmt(-Number(refund.amount)),
                    bold: true,
                    fontSize: 12,
                    alignment: "right",
                    border: false,
                    margin: [0, 2, 0, 5],
                  },
                ],
              ]
            : [
                [
                  {
                    text: t.invoice.totalInclVat,
                    bold: true,
                    fontSize: 12,
                    border: [false, true, false, false],
                    margin: [0, 7, 0, 2],
                  },
                  {
                    text: fmt(-Number(refund.amount)),
                    bold: true,
                    fontSize: 12,
                    alignment: "right",
                    border: [false, true, false, false],
                    margin: [0, 7, 0, 2],
                  },
                ],
                [
                  {
                    text: `${t.invoice.vat} ${taxRate}%`,
                    border: false,
                    margin: [0, 2, 0, 5],
                  },
                  {
                    text: fmt(-refundTaxAmount),
                    alignment: "right",
                    border: false,
                    margin: [0, 2, 0, 5],
                  },
                ],
              ]),
        ] as TableCell[][],
      },
    },
  ]
}

export default invoiceContent
