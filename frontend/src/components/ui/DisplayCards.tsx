import { cn } from "../../lib/utils";

interface CardData {
  icon: React.ReactNode;
  title: string;
  description: string;
  date: string;
  iconBg?: string;
}

interface DisplayCardsProps {
  cards: CardData[];
}

export function DisplayCards({ cards }: DisplayCardsProps) {
  return (
    <div className="relative flex h-48 w-full items-center justify-center">
      {cards.map((card, i) => {
        const offset = i - Math.floor(cards.length / 2);
        const rotate = offset * 6;
        const translateX = offset * 24;
        const translateY = Math.abs(offset) * 10;
        const zIndex = cards.length - Math.abs(offset);

        return (
          <div
            key={i}
            className="absolute w-52 rounded-xl border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-elevation-2)] transition-all duration-300 hover:z-50 hover:scale-105 hover:shadow-[var(--shadow-elevation-hover)]"
            style={{
              transform: `rotate(${rotate}deg) translateX(${translateX}px) translateY(${translateY}px)`,
              zIndex,
            }}
          >
            <div
              className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ background: card.iconBg ?? "var(--color-accent-light)" }}
            >
              <span className="text-[var(--color-accent)]">{card.icon}</span>
            </div>
            <div className="text-xs font-semibold text-[var(--color-ink)] mb-1 leading-tight">
              {card.title}
            </div>
            <div className="text-[11px] text-[var(--color-muted)] leading-snug mb-2">
              {card.description}
            </div>
            <div
              className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded"
              style={{
                background: "var(--color-accent-light)",
                color: "var(--color-accent)",
              }}
            >
              {card.date}
            </div>
          </div>
        );
      })}
    </div>
  );
}
