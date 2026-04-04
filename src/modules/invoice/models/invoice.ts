import {model} from "@medusajs/framework/utils"

const Invoice = model.define("invoice", {
  id: model.id({prefix: "inv"}).primaryKey(),
  display_id: model.autoincrement().searchable(),
  resource_id: model.text(),
  type: model.enum(["debit", "credit", "void"]),
  pdf_url: model.text().nullable(),
  parent_invoice: model.belongsTo(() => Invoice).nullable(),
  metadata: model.json().nullable(),
})

export default Invoice
