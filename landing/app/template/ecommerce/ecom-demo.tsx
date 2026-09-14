"use client";

import {
  ArrowUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Images,
  MessageCircle,
  Mic,
  Plus,
  Search,
  Share,
  SquarePen,
} from "lucide-react";
import Image from "next-image-export-optimizer";
import { useRef, useState } from "react";
import { OpenAILogo } from "../../components/showcase/chatgpt-frame";

const ASSETS = "/assets/template/ecommerce/lv";
const SIZES = "(max-width: 700px) 62vw, 300px";

const PRODUCTS = [
  {
    id: "neverfull-mm",
    name: "Sac Neverfull MM",
    price: "1 550,00€",
    alt: true,
  },
  {
    id: "express-pm",
    name: "Sac Express PM",
    price: "3 500,00€",
    alt: true,
    label: "Défilé",
  },
  {
    id: "etui-3-montres",
    name: "Étui 3 montres",
    price: "1 200,00€",
    alt: true,
  },
  { id: "croisette", name: "Soulier bateau LV Croisette", price: "960,00€" },
];

export function EcomDemo() {
  const carousel = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const onScroll = () => {
    const el = carousel.current;
    if (!el) {
      return;
    }
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
  };

  const scroll = (direction: 1 | -1) => {
    const el = carousel.current;
    if (!el) {
      return;
    }
    const step = el.clientWidth / 2;
    const max = el.scrollWidth - el.clientWidth;
    const target = el.scrollLeft + direction * step;
    const left = target > max - step / 2 ? max : target < step / 2 ? 0 : target;
    el.scrollTo({ left, behavior: "smooth" });
  };

  return (
    <div className="ed-shell">
      <aside className="ed-side" aria-hidden="true">
        <div className="ed-side-logo">
          <OpenAILogo size={16} />
        </div>
        <SquarePen size={18} strokeWidth={1.5} />
        <Search size={18} strokeWidth={1.5} />
        <MessageCircle size={18} strokeWidth={1.5} />
        <Images size={18} strokeWidth={1.5} />
        <Image
          src="/assets/showcase/icons/alpic.webp"
          alt=""
          width={28}
          height={28}
          className="ed-side-user"
        />
      </aside>
      <div className="ed-main">
        <div className="ed-top" aria-hidden="true">
          <span className="ed-top-model">
            ChatGPT <ChevronDown size={14} strokeWidth={1.5} />
          </span>
          <Share size={16} strokeWidth={1.5} />
        </div>
        <div className="ed-thread">
          <div className="ed-user">
            A Christmas gift for my wife, she loves leather goods, around €1500.
          </div>
          <div className="ed-asst">
            <div className="ed-tool">
              <Image
                src="/assets/showcase/icons/louis-vuitton.webp"
                alt=""
                width={20}
                height={20}
                className="ed-tool-icon"
              />
              <span className="ed-tool-app">Louis Vuitton</span>
              <span>Searched the catalog</span>
            </div>
            <p>
              Here is a short selection from the Maison's leather goods within
              your budget, with one runway piece in case you would like to go
              further.
            </p>
            <div className="ed-widget">
              <div
                className="ed-carousel"
                aria-label="Product carousel"
                ref={carousel}
                onScroll={onScroll}
              >
                {PRODUCTS.map((product) => (
                  <div className="ed-card" key={product.id}>
                    <div className="ed-card-img">
                      <Image
                        src={`${ASSETS}/${product.id}.webp`}
                        alt={product.name}
                        fill
                        sizes={SIZES}
                      />
                      {product.alt && (
                        <Image
                          src={`${ASSETS}/${product.id}-alt.webp`}
                          alt=""
                          fill
                          sizes={SIZES}
                          className="ed-card-img-alt"
                        />
                      )}
                    </div>
                    <div className="ed-card-name">{product.name}</div>
                    <div className="ed-card-price">{product.price}</div>
                    {product.label && (
                      <div className="ed-card-label">{product.label}</div>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="ed-widget-nav ed-widget-nav--prev"
                aria-label="Previous products"
                onClick={() => scroll(-1)}
                hidden={atStart}
              >
                <ChevronLeft size={18} strokeWidth={1.5} />
              </button>
              <button
                type="button"
                className="ed-widget-nav ed-widget-nav--next"
                aria-label="Next products"
                onClick={() => scroll(1)}
                hidden={atEnd}
              >
                <ChevronRight size={18} strokeWidth={1.5} />
              </button>
            </div>
            <p>
              Would you prefer something more classic, or shall I look at
              jewelry instead?
            </p>
          </div>
        </div>
        <div className="ed-composer" aria-hidden="true">
          <Plus size={18} strokeWidth={1.5} />
          <span className="ed-composer-text">Ask anything</span>
          <Mic size={18} strokeWidth={1.5} />
          <ArrowUp size={18} strokeWidth={1.5} />
        </div>
      </div>
    </div>
  );
}
