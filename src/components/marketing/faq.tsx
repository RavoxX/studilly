"use client";

import * as Accordion from "@radix-ui/react-accordion";
import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr";
import { useT } from "@/i18n/client";

/**
 * FAQ.
 *
 * Radix Accordion rather than a hand-rolled disclosure: it handles keyboard
 * navigation, `aria-expanded` and the heading/button relationship correctly,
 * which is easy to get subtly wrong by hand.
 */
export function Faq() {
  const t = useT();

  const items = [
    { q: t.marketing.faq.q1, a: t.marketing.faq.a1 },
    { q: t.marketing.faq.q2, a: t.marketing.faq.a2 },
    { q: t.marketing.faq.q3, a: t.marketing.faq.a3 },
    { q: t.marketing.faq.q4, a: t.marketing.faq.a4 },
    { q: t.marketing.faq.q5, a: t.marketing.faq.a5 },
    { q: t.marketing.faq.q6, a: t.marketing.faq.a6 },
  ];

  return (
    <Accordion.Root
      type="single"
      collapsible
      className="divide-y divide-line border-y border-line"
    >
      {items.map((item, index) => (
        <Accordion.Item key={item.q} value={`item-${index}`}>
          <Accordion.Header>
            <Accordion.Trigger className="group flex w-full items-start justify-between gap-4 py-5 text-left">
              <span className="text-base font-medium text-ink">{item.q}</span>
              <CaretDownIcon
                size={18}
                className="mt-1 shrink-0 text-ink-subtle transition-transform duration-200 group-data-[state=open]:rotate-180"
                aria-hidden="true"
              />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="overflow-hidden data-[state=closed]:animate-none">
            <p className="max-w-[70ch] pb-5 pr-8 text-sm leading-relaxed text-ink-muted">
              {item.a}
            </p>
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}
