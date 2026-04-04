import {defineMiddlewares} from "@medusajs/framework/http"
import {authenticate} from "@medusajs/medusa"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/orders/:id/invoice",
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
  ],
})
