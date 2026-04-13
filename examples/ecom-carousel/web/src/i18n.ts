import { useUser } from "skybridge/web";

const translations: Record<string, Record<string, string>> = {
  en: {
    loading: "Loading products...",
    noProducts: "No product found",
    addToCart: "Add to cart",
    removeFromCart: "Remove",
    checkout: "Checkout",
    orderSummary: "Order summary",
    total: "Total",
    payWithStripe: "Pay with Stripe",
    creatingSession: "Redirecting to checkout...",
    waitingForPayment: "Waiting for payment...",
    paymentSuccess: "Payment successful!",
    paymentExpired: "Checkout session expired",
    backToProducts: "Back to products",
  },
  fr: {
    loading: "Chargement des produits...",
    noProducts: "Aucun produit trouvé",
    addToCart: "Ajouter",
    removeFromCart: "Retirer",
    checkout: "Payer",
    orderSummary: "Récapitulatif de commande",
    total: "Total",
    payWithStripe: "Payer avec Stripe",
    creatingSession: "Redirection vers le paiement...",
    waitingForPayment: "En attente du paiement...",
    paymentSuccess: "Paiement réussi !",
    paymentExpired: "Session de paiement expirée",
    backToProducts: "Retour aux produits",
  },
  es: {
    loading: "Cargando productos...",
    noProducts: "No se encontraron productos",
    addToCart: "Añadir",
    removeFromCart: "Quitar",
    checkout: "Pagar",
    orderSummary: "Resumen del pedido",
    total: "Total",
    payWithStripe: "Pagar con Stripe",
    creatingSession: "Redirigiendo al pago...",
    waitingForPayment: "Esperando el pago...",
    paymentSuccess: "Pago exitoso!",
    paymentExpired: "Sesión de pago expirada",
    backToProducts: "Volver a productos",
  },
  de: {
    loading: "Produkte werden geladen...",
    noProducts: "Keine Produkte gefunden",
    addToCart: "Hinzufügen",
    removeFromCart: "Entfernen",
    checkout: "Zur Kasse",
    orderSummary: "Bestellübersicht",
    total: "Gesamt",
    payWithStripe: "Mit Stripe bezahlen",
    creatingSession: "Weiterleitung zur Kasse...",
    waitingForPayment: "Warte auf Zahlung...",
    paymentSuccess: "Zahlung erfolgreich!",
    paymentExpired: "Zahlungssitzung abgelaufen",
    backToProducts: "Zurück zu Produkten",
  },
};

export function useTranslate() {
  const { locale } = useUser();
  const lang = locale?.split("-")[0] ?? "en";

  return function t(key: string) {
    return translations[lang]?.[key] ?? translations.en[key];
  };
}
