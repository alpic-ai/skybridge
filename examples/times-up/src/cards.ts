import cards from "./cards.json" with { type: "json" };

export const drawCard = () => {
  return cards[Math.floor(Math.random() * cards.length)];
};

export const getCard = (id: string) => {
  return cards.find((card) => card.id === id);
};
