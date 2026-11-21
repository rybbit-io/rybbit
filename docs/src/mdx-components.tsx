import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import { DocsHomeCards } from "@/components/DocsHomeCards";
import { GuideIndex } from "@/components/GuideIndex";
import { Mermaid } from "@/components/Mermaid";
import * as TabsComponents from "fumadocs-ui/components/tabs";
import { ImageZoom } from "fumadocs-ui/components/image-zoom";

// use this function to get MDX components, you will need it for rendering MDX
export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    ...TabsComponents,
    DocsHomeCards,
    GuideIndex,
    Mermaid,
    img: props => <ImageZoom {...(props as any)} />,
    ...components,
  };
}
