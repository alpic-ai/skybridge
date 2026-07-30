export interface CoffeeShop {
  id: string;
  name: string;
  neighborhood: string;
  rating: number;
  specialty: string;
  imageUrl: string;
  isFavorite?: boolean;
}

const COFFEE_SHOPS: CoffeeShop[] = [
  {
    id: "shop-1",
    name: "Cafe de Flore",
    neighborhood: "Saint-Germain-des-Pres",
    rating: 4.5,
    specialty: "Classic French cafe culture",
    imageUrl:
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400",
  },
  {
    id: "shop-2",
    name: "Coutume Cafe",
    neighborhood: "Le Marais",
    rating: 4.7,
    specialty: "Specialty roasting",
    imageUrl:
      "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400",
  },
  {
    id: "shop-3",
    name: "Boot Cafe",
    neighborhood: "Le Marais",
    rating: 4.4,
    specialty: "Third-wave espresso",
    imageUrl:
      "https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=400",
  },
  {
    id: "shop-4",
    name: "Cafe Kitsune",
    neighborhood: "Palais Royal",
    rating: 4.3,
    specialty: "Japanese-inspired lattes",
    imageUrl:
      "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400",
  },
  {
    id: "shop-5",
    name: "Telescope Cafe",
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
    name: "Cafe Oberkampf",
    neighborhood: "Oberkampf",
    rating: 4.8,
    specialty: "Single origin pour-overs",
    imageUrl:
      "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400",
  },
];

const MOCK_FAVORITES = ["shop-1", "shop-5", "shop-8"];

export interface SearchParams {
  query?: string;
  minRating?: number;
  userId: string;
}

export interface SearchResult {
  shops: CoffeeShop[];
  totalCount: number;
}

export function searchCoffeeShops(params: SearchParams): SearchResult {
  const { query, minRating } = params;

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

  // Always personalized since auth is required
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

  return {
    shops: results,
    totalCount: results.length,
  };
}
