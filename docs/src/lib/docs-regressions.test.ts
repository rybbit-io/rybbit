import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { createElement, Fragment } from "react";

import { withEnglishFallback } from "../i18n/messages";
import { createFaqSchema, faqAnswerText } from "./faq-schema";

describe("localized docs regressions", () => {
  it("falls back for missing, empty, and whitespace-only messages without replacing translations", () => {
    const english = { missing: "Missing", empty: "Empty", whitespace: "Whitespace", translated: "Hello" };
    const localized = { empty: "", whitespace: " \t\n", translated: "Bonjour", extra: "Extra" };
    assert.deepEqual(withEnglishFallback(english, localized), {
      ...english,
      translated: "Bonjour",
      extra: "Extra",
    });
    assert.equal(localized.empty, "");
  });

  it("keeps FAQ schema questions and nested translated answers identical to the visible items", () => {
    const answer = createElement(
      Fragment,
      null,
      createElement("p", null, "Consultez ", createElement("a", { href: "/docs" }, "notre documentation"), "."),
      createElement("br"),
      createElement("p", null, "Puis commencez.")
    );
    const items = [
      { question: "Comment commencer ?", answer },
      { question: "Combien ?", answer: "Gratuit." },
    ];
    const schema = createFaqSchema(items);
    assert.equal(schema.mainEntity.length, items.length);
    assert.deepEqual(
      schema.mainEntity.map(item => item.name),
      items.map(item => item.question)
    );
    assert.equal(schema.mainEntity[0].acceptedAnswer.text, "Consultez notre documentation. Puis commencez.");
    assert.equal(schema.mainEntity[1].acceptedAnswer.text, "Gratuit.");
    assert.equal(faqAnswerText(createElement(Fragment, null, false, null, 0)), "0");
  });

  it("uses one FAQ source and escapes schema script delimiters", () => {
    const component = readFileSync(new URL("../components/FAQAccordion.tsx", import.meta.url), "utf8");
    const template = readFileSync(new URL("../components/LandingPageTemplate.tsx", import.meta.url), "utf8");
    assert.match(component, /items\.map/);
    assert.match(component, /createFaqSchema\(items\)/);
    assert.match(component, /replace\(\/<\/g/);
    assert.doesNotMatch(template, /const faqSchema/);
  });
});
