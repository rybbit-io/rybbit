import { Children, isValidElement, type ReactNode } from "react";

export function faqAnswerText(answer: ReactNode): string {
  function text(node: ReactNode): string {
    if (typeof node === "string" || typeof node === "number") return String(node);
    if (!isValidElement<{ children?: ReactNode }>(node)) return "";
    if (node.type === "br") return " ";
    const content = Children.toArray(node.props.children).map(text).join("");
    return node.type === "p" ? content + " " : content;
  }
  return Children.toArray(answer).map(text).join("").replace(/\s+/g, " ").trim();
}

export function createFaqSchema(items: { question: string; answer: ReactNode }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map(item => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: faqAnswerText(item.answer) },
    })),
  };
}
