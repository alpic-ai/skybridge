export interface CoffeeShop {
  id: string;
  name: string;
  neighborhood: string;
  rating: number;
  specialty: string;
  imageUrl: string;
  isFavorite?: boolean;
}

export interface OrderItem {
  name: string;
  size: string;
  price: number;
}

export interface Order {
  id: string;
  shop: {
    id: string;
    name: string;
    imageUrl: string;
  };
  items: OrderItem[];
  total: number;
  timestamp: string;
  status: "delivered" | "preparing" | "cancelled";
}

const COFFEE_SHOPS: CoffeeShop[] = [
  {
    id: "shop-1",
    name: "Café de Flore",
    neighborhood: "Saint-Germain-des-Prés",
    rating: 4.5,
    specialty: "Classic French café culture",
    imageUrl:
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400",
  },
  {
    id: "shop-2",
    name: "Coutume Café",
    neighborhood: "Le Marais",
    rating: 4.7,
    specialty: "Specialty roasting",
    imageUrl:
      "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400",
  },
  {
    id: "shop-3",
    name: "Boot Café",
    neighborhood: "Le Marais",
    rating: 4.4,
    specialty: "Third-wave espresso",
    imageUrl:
      "https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=400",
  },
  {
    id: "shop-4",
    name: "Café Kitsuné",
    neighborhood: "Palais Royal",
    rating: 4.3,
    specialty: "Japanese-inspired lattes",
    imageUrl:
      "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400",
  },
  {
    id: "shop-5",
    name: "Télescope Café",
    neighborhood: "Palais Royal",
    rating: 4.6,
    specialty: "Filter coffee experts",
    imageUrl:
      "https://images.unsplash.com/photo-1498804103079-a6351b050096?w=400",
  },
  {
    id: "shop-6",
    name: "Fragments",
    neighborhood: "Le Marais",
    rating: 4.5,
    specialty: "Organic brunch & coffee",
    imageUrl:
      "https://images.unsplash.com/photo-1511920170033-f8396924c348?w=400",
  },
  {
    id: "shop-7",
    name: "Holybelly",
    neighborhood: "Canal Saint-Martin",
    rating: 4.4,
    specialty: "Australian-style flat whites",
    imageUrl:
      "https://images.unsplash.com/photo-1507133750040-4a8f57021571?w=400",
  },
  {
    id: "shop-8",
    name: "Café Oberkampf",
    neighborhood: "Oberkampf",
    rating: 4.8,
    specialty: "Single origin pour-overs",
    imageUrl:
      "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400",
  },
];

const MOCK_FAVORITES = ["shop-1", "shop-5", "shop-8"];

const MOCK_ORDERS: Order[] = [
  {
    id: "order-1",
    shop: {
      id: "shop-1",
      name: "Café de Flore",
      imageUrl:
        "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=100",
    },
    items: [
      { name: "Café Crème", size: "Grand", price: 5.5 },
      { name: "Pain au Chocolat", size: "Regular", price: 3.5 },
    ],
    total: 9.0,
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    status: "delivered",
  },
  {
    id: "order-2",
    shop: {
      id: "shop-5",
      name: "Télescope Café",
      imageUrl:
        "https://images.unsplash.com/photo-1498804103079-a6351b050096?w=100",
    },
    items: [{ name: "Flat White", size: "Regular", price: 4.5 }],
    total: 4.5,
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    status: "delivered",
  },
  {
    id: "order-3",
    shop: {
      id: "shop-8",
      name: "Café Oberkampf",
      imageUrl:
        "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=100",
    },
    items: [
      { name: "Noisette", size: "Regular", price: 3.5 },
      { name: "Tartine Avocat", size: "Regular", price: 11.0 },
      { name: "Jus d'Orange", size: "Small", price: 5.0 },
    ],
    total: 19.5,
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    status: "delivered",
  },
  {
    id: "order-4",
    shop: {
      id: "shop-2",
      name: "Coutume Café",
      imageUrl:
        "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=100",
    },
    items: [{ name: "Double Espresso", size: "Double", price: 3.8 }],
    total: 3.8,
    timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    status: "delivered",
  },
];

export interface SearchParams {
  query?: string;
  minRating?: number;
  userId?: string;
}

export interface SearchResult {
  shops: CoffeeShop[];
  isPersonalized: boolean;
  totalCount: number;
}

export function searchCoffeeShops(params: SearchParams): SearchResult {
  const { query, minRating, userId } = params;

  let results = [...COFFEE_SHOPS];

  if (query) {
    const lowerQuery = query.toLowerCase();
    results = results.filter(
      (shop) =>
        shop.name.toLowerCase().includes(lowerQuery) ||
        shop.specialty.toLowerCase().includes(lowerQuery),
    );
  }

  if (minRating !== undefined) {
    results = results.filter((shop) => shop.rating >= minRating);
  }

  const isPersonalized = !!userId;
  if (userId) {
    results = results.map((shop) => ({
      ...shop,
      isFavorite: MOCK_FAVORITES.includes(shop.id),
    }));

    results.sort((shopA, shopB) => {
      if (shopA.isFavorite && !shopB.isFavorite) {
        return -1;
      }
      if (!shopA.isFavorite && shopB.isFavorite) {
        return 1;
      }
      return shopB.rating - shopA.rating;
    });
  } else {
    results.sort((shopA, shopB) => shopB.rating - shopA.rating);
  }

  return {
    shops: results,
    isPersonalized,
    totalCount: results.length,
  };
}

export function getPastOrders(_userId: string, limit: number = 10): Order[] {
  // For demo: return mock orders for any authenticated user
  return MOCK_ORDERS.slice(0, limit);
}
