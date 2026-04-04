import {Column, Content, TableCell} from "pdfmake/interfaces"
import {OrderDTO} from "@medusajs/types"
import {getI18nMessages, resolveLocale} from "../../../../i18n"
import {ModuleOptions} from "../../../../modules/invoice/service"

const packingSlipContent = async (order: OrderDTO, options: ModuleOptions): Promise<Content> => {
  const locale = resolveLocale(order.metadata?.locale, options.defaultLocale)
  const t = getI18nMessages(locale)

  if (!order.billing_address || !order.shipping_address) {
    throw new Error("Billing and or shipping address is missing")
  }

  return [
    {
      columns: [
        [
          {
            text: t.packingSlip.packingSlip,
            width: "*",
            fontSize: 28,
            bold: true,
            alignment: "right",
            margin: [0, 0, 0, 15],
          },
          {
            stack: [
              {
                columns: [
                  {
                    text: t.invoice.orderNumber,
                    color: "#aaaaab",
                    width: "*",
                    fontSize: 12,
                    alignment: "right",
                  },
                  {
                    text: `#${order.display_id.toString().padStart(5, "0")}`,
                    fontSize: 12,
                    alignment: "right",
                    width: 100,
                  },
                ],
              },
            ],
          },
        ],
      ] as Column[],
    },
    {
      columns: [
        {
          text: t.invoice.billingAddress,
          color: "#aaaaab",
          fontSize: 12,
          margin: [0, 20, 0, 5],
        },
        {
          text: t.invoice.deliveryAddress,
          color: "#aaaaab",
          fontSize: 12,
          margin: [0, 20, 0, 5],
        },
      ],
    },
    {
      columns: [
        {
          text: `${order.billing_address.first_name} ${order.billing_address.last_name} \n ${
            order.billing_address.address_1
          } ${!order.billing_address.address_2 ? "" : order.billing_address.address_2} \n ${
            order.billing_address.postal_code
          } ${order.billing_address.city} \n ${t.countries[order.billing_address.country_code!] ?? order.billing_address.country_code} \n\n E: ${order.email} \n T: ${order.shipping_address.phone}`,
        },
        {
          stack: [
            // Wrap array inside an object using 'stack'
            {
              text: `${order.shipping_address.first_name} ${order.shipping_address.last_name} \n ${
                order.shipping_address.address_1
              } ${!order.shipping_address.address_2 ? "" : order.shipping_address.address_2} \n ${
                order.shipping_address.postal_code
              } ${order.shipping_address.city} \n ${t.countries[order.shipping_address.country_code!] ?? order.shipping_address.country_code}`,
            },
          ],
        },
      ] as Column[],
    },
    "\n\n",
    {
      layout: {
        defaultBorder: false,
        hLineWidth: function (i, node) {
          return 1
        },
        vLineWidth: function (i, node) {
          return 0
        },
        hLineColor: function (i, node) {
          return "#aaa"
        },
        paddingLeft: function (i, node) {
          return 5
        },
        paddingRight: function (i, node) {
          return 5
        },
        paddingTop: function (i, node) {
          return 0
        },
        paddingBottom: function (i, node) {
          return 0
        },
      },
      table: {
        headerRows: 1,
        widths: ["auto", 215, "*"],
        body: [
          [
            {
              text: t.invoice.quantity,
              style: "tableHeader",
            },
            {
              text: t.invoice.product,
              style: "tableHeader",
            },
            {
              text: t.invoice.contents,
              style: "tableHeader",
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
                text: `${item.title}`,
                style: "lineItemStyle",
                border: [false, false, false, true],
              },
              {
                text: `${(item as any)?.variant?.inventory_items?.map((im) => `${im.required_quantity}x ${im.inventory.title}`).join("\n")}`,
                style: "lineItemStyle",
                border: [false, false, false, true],
              },
            ] as TableCell[]
          }),
        ],
      },
    },
    ...(!!order.metadata?.delivery_instruction
      ? ([
          "\n\n",
          {
            stack: [
              {
                text: t.packingSlip.deliveryNote,
                bold: true,
                fontSize: 12,
                margin: [0, 20, 0, 5],
              },
              {
                text: order.metadata.delivery_instruction,
              },
            ],
          },
        ] as Column[])
      : []),
  ]
}

export default packingSlipContent
