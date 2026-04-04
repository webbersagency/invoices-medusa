import {Content, TDocumentDefinitions} from "pdfmake/interfaces"
import {ModuleOptions} from "../../../../modules/invoice/service"

const base = (
  content: Content | Content[],
  options: ModuleOptions
): TDocumentDefinitions => ({
  pageMargins: [40, 60, 40, 54],
  content,
  header: options.header,
  footer: options.footer,
  styles: {
    tableHeader: {
      margin: [0, 7, 0, 5],
      color: options.colors?.text ?? "#fff",
      fillColor: options.colors?.background ?? "#000",
    },
    lineItemStyle: {
      margin: [0, 7, 0, 5],
    },
    priceStyle: {},
    fromPriceStyle: {
      decoration: "lineThrough",
      margin: [0, 0, 0, 0],
    },
  },
  defaultStyle: {
    font: "Helvetica",
    lineHeight: 1.25,
    columnGap: 20,
    fontSize: 10,
    color: "#000",
  },
})

export default base
