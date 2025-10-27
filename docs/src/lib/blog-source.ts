import { loader } from "fumadocs-core/source";
import { blog } from "@/.source";

export const blogSource = loader({
  baseUrl: "/blog",
  source: blog.toFumadocsSource?.() ?? blog,
});
