const formatLocaleAmount = (amount: number, currencyCode: string, locale: string = "nl-NL") => {
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currencyDisplay: "narrowSymbol",
    currency: currencyCode,
  })

  return formatter.format(amount)
}

export default formatLocaleAmount
