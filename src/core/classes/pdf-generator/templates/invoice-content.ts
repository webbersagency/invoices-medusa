import {Column, Content, TableCell} from "pdfmake/interfaces"
import {getI18nMessages, resolveLocale} from "../../../../i18n"
import formatLocaleAmount from "../../../../utils/format-locale-amount"
import {OrderWithInvoices} from "../index"
import {addDays, formatDate} from "date-fns"
import {ModuleOptions} from "../../../../modules/invoice/service"

const invoiceContent = async (
  order: OrderWithInvoices,
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

  const taxRateMap = new Map<number, number>()

  const collectTaxLines = (taxLines: any[]) => {
    for (const taxLine of taxLines ?? []) {
      const rate: number = taxLine.rate ?? 0
      const amount: number = Number(taxLine.total ?? 0)
      taxRateMap.set(rate, (taxRateMap.get(rate) ?? 0) + amount)
    }
  }

  for (const item of order.items ?? []) {
    collectTaxLines((item as any).tax_lines)
  }

  for (const shippingMethod of (order as any).shipping_methods ?? []) {
    collectTaxLines(shippingMethod.tax_lines)
  }

  const taxLinesPdf = [...taxRateMap.entries()].map(([rate, amount]) => [
    {
      text: `${t.invoice.vat} ${rate}%`,
      border: false,
      margin: [0, 2, 0, 5],
    },
    {
      text: fmt(amount),
      alignment: "right",
      border: false,
      margin: [0, 2, 0, 5],
    },
  ])

  const invoice = order.invoices.find((i) => i.type === "debit")
  const deliveryDate =
    order.metadata?.delivery_date ??
    order.shipping_methods?.[0]?.data?.delivery_date

  if (!invoice) {
    throw new Error("Invoice is missing")
  }

  // @ts-ignore
  return [
    {
      columns: [
        {
          text: t.invoice.invoice,
          width: "*",
          fontSize: 28,
          bold: true,
          margin: [0, 0, 0, 15],
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
          stack: [
            {
              text: t.invoice.invoiceNumber,
              color: "#aaaaab",
              width: "*",
              fontSize: 11,
              margin: [0, 10, 0, 2],
            },
            {
              text: `#${invoice.display_id.toString().padStart(5, "0")}`,
            } as Content,
          ],
        },
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
            },
          ],
        },
        {
          stack: [
            {
              text: t.invoice.dueDate,
              color: "#aaaaab",
              width: "*",
              fontSize: 11,
              margin: [0, 10, 0, 2],
            },
            {
              text: formatDate(addDays(invoice.created_at, 30), "dd-MM-yyyy"),
            },
          ],
        },
      ] as Content[],
    },
    {
      columns: [
        {
          stack: [
            {
              text: t.invoice.orderNumber,
              color: "#aaaaab",
              width: "*",
              fontSize: 11,
              margin: [0, 10, 0, 2],
            },
            {
              text: `#${order.display_id.toString().padStart(5, "0")}`,
            },
          ],
        },
        ...(deliveryDate
          ? [
              {
                stack: [
                  {
                    text: t.invoice.deliveryDate,
                    color: "#aaaaab",
                    width: "*",
                    fontSize: 11,
                    margin: [0, 10, 0, 2],
                  },
                  {
                    text: formatDate(new Date(`${deliveryDate}`), "dd-MM-yyyy"),
                  } as Content,
                ],
              },
              {
                stack: order.metadata?.po_number
                  ? [
                      {
                        text: t.invoice.poNumber,
                        color: "#aaaaab",
                        width: "*",
                        fontSize: 11,
                        margin: [0, 10, 0, 2],
                      },
                      {
                        text: order.metadata?.po_number,
                      } as Content,
                    ]
                  : [
                      {
                        text: "",
                        width: "*",
                      },
                    ],
              },
            ]
          : []),
      ] as Content[],
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
          text: `${order.billing_address.company ? `${order.billing_address.company} - ` : ""}${order.billing_address.first_name} ${order.billing_address.last_name} \n ${
            order.billing_address.address_1
          } ${!order.billing_address.address_2 ? "" : order.billing_address.address_2} \n ${
            order.billing_address.postal_code
          } ${order.billing_address.city} \n ${t.countries[order.billing_address.country_code!] ?? order.billing_address.country_code}
           \n E: ${order.email}${order.shipping_address.phone ? `\n T: ${order.shipping_address.phone}` : ""}`,
        },
        {
          text: `${order.shipping_address.company ? `${order.shipping_address.company} - ` : ""}${order.shipping_address.first_name} ${order.shipping_address.last_name} \n ${
            order.shipping_address.address_1
          } ${!order.shipping_address.address_2 ? "" : order.shipping_address.address_2} \n ${
            order.shipping_address.postal_code
          } ${order.shipping_address.city} \n ${t.countries[order.shipping_address.country_code!] ?? order.shipping_address.country_code}`,
        },
      ] as Column[],
    },
    "\n",
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
        widths: ["auto", "*", "auto", "auto", "auto"],
        body: [
          [
            {
              text: t.invoice.quantity,
              style: "tableHeader",
            },
            {
              text: t.invoice.item,
              style: "tableHeader",
            },
            {
              text: t.invoice.ean,
              style: "tableHeader",
            },
            {
              text: t.invoice.unitPrice,
              style: "tableHeader",
            },
            {
              text: t.invoice.subtotal,
              style: "tableHeader",
              alignment: "right",
            },
          ],
          ...(order.items ?? []).map((item) => {
            return [
              {
                text: `${item.quantity}x`,
                style: "lineItemStyle",
                border: [false, false, false, true],
              },
              {
                text: [
                  {text: `${item.title} -  ${item.subtitle}`},
                  ...((item as any)?.variant?.inventory_items &&
                  (item as any)?.variant?.inventory_items?.length > 1
                    ? [
                        (item as any)?.variant?.inventory_items ? `:\n` : "",
                        (item as any)?.variant?.inventory_items
                          ?.map(
                            (im) =>
                              `- ${im.required_quantity}x ${im.inventory.title} ${!!im.inventory.metadata?.content ? "- " + im.inventory.metadata?.content : ""}`
                          )
                          .join("\n"),
                      ]
                    : []),
                ],
                style: "lineItemStyle",
                border: [false, false, false, true],
              },
              {
                text:
                  (item as unknown as {variant?: {ean?: string | null}})
                    ?.variant?.ean ?? "-",
                style: "lineItemStyle",
                border: [false, false, false, true],
              },
              {
                stack: [
                  ...(item.original_total &&
                  Number(item.original_total) !== Number(item.total)
                    ? [
                        {
                          text: fmt(
                            Number(
                              formatExclVat
                                ? item.original_subtotal
                                : item.original_total
                            ) / item.quantity
                          ),
                          style: "fromPriceStyle",
                          alignment: "center",
                        },
                      ]
                    : []),
                  {
                    text: fmt(
                      Number(formatExclVat ? item.subtotal : item.total) /
                        item.quantity
                    ),
                    style: "priceStyle",
                    alignment: "center",
                  },
                ],
                style: "lineItemStyle",
                border: [false, false, false, true],
              },
              {
                stack: [
                  ...(item.original_total &&
                  Number(item.original_total) !== Number(item.total)
                    ? [
                        {
                          text: fmt(
                            Number(
                              formatExclVat
                                ? item.original_subtotal
                                : item.original_total
                            )
                          ),
                          style: "fromPriceStyle",
                          alignment: "right",
                        },
                      ]
                    : []),
                  {
                    text: fmt(
                      Number(formatExclVat ? item.subtotal : item.total)
                    ),
                    style: "priceStyle",
                    alignment: "right",
                  },
                ],
                style: "lineItemStyle",
                border: [false, false, false, true],
              },
            ] as TableCell[]
          }),
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
          [
            {
              text: t.invoice.subtotal,
              bold: true,
              border: false,
              margin: [0, 7, 0, 5],
            },
            {
              text: fmt(
                Number(
                  formatExclVat
                    ? order.original_item_subtotal
                    : order.original_item_total
                )
              ),
              bold: true,
              border: false,
              alignment: "right",
              margin: [0, 7, 0, 5],
            },
          ],
          ...(order.discount_total && Number(order.discount_total) > 0
            ? (() => {
                const adjMap = new Map<string, number>()
                for (const item of order.items ?? []) {
                  for (const adj of (item.adjustments ?? [])) {
                    if (adj.code) {
                      adjMap.set(adj.code, (adjMap.get(adj.code) ?? 0) + Number(adj.amount))
                    }
                  }
                }
                return adjMap.size > 0
                  ? [...adjMap.entries()].map(([code, amount]) => [
                      {
                        text: `${t.invoice.discount} (${code})`,
                        bold: true,
                        border: false,
                        margin: [0, 2, 0, 5],
                      },
                      {
                        text: `- ${fmt(amount)}`,
                        bold: true,
                        border: false,
                        alignment: "right",
                        margin: [0, 2, 0, 5],
                      },
                    ])
                  : [[
                      {
                        text: t.invoice.discount,
                        bold: true,
                        border: false,
                        margin: [0, 2, 0, 5],
                      },
                      {
                        text: `- ${fmt(Number(formatExclVat ? order.discount_subtotal : order.discount_total))}`,
                        bold: true,
                        border: false,
                        alignment: "right",
                        margin: [0, 2, 0, 5],
                      },
                    ]]
              })()
            : []),
          [
            {
              text: t.invoice.shipping,
              bold: true,
              border: false,
              margin: [0, 2, 0, 5],
            },
            {
              text: `${
                order.shipping_total === 0
                  ? t.invoice.free
                  : fmt(
                      Number(
                        formatExclVat
                          ? order.shipping_subtotal
                          : order.shipping_total
                      )
                    )
              }`,
              bold: true,
              border: false,
              alignment: "right",
              margin: [0, 2, 0, 5],
            },
          ],
          ...(formatExclVat
            ? [
                [
                  {
                    text: t.invoice.totalExclVat,
                    border: [false, true, false, false],
                    margin: [0, 7, 0, 2],
                  },
                  {
                    text: fmt(
                      Number(order.total) +
                        Number(order.credit_line_total) -
                        Number(order.tax_total)
                    ),
                    alignment: "right",
                    border: [false, true, false, false],
                    margin: [0, 7, 0, 2],
                  },
                ],
                ...taxLinesPdf,
                [
                  {
                    text: t.invoice.totalInclVat,
                    bold: true,
                    fontSize: 12,
                    border: false,
                    margin: [0, 2, 0, 5],
                  },
                  {
                    text: fmt(
                      Number(order.total) + Number(order.credit_line_total)
                    ),
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
                    text: fmt(
                      Number(order.total) + Number(order.credit_line_total)
                    ),
                    bold: true,
                    fontSize: 12,
                    alignment: "right",
                    border: [false, true, false, false],
                    margin: [0, 7, 0, 2],
                  },
                ],
                ...taxLinesPdf,
              ]),
        ] as TableCell[][],
      },
    },
  ]
}

export default invoiceContent
