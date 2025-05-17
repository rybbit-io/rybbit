import React from "react";

// Code block component with syntax highlighting styling
export function CodeBlock({ children, className }) {
  const language = className ? className.replace(/language-/, "") : "";

  // Clean up the content by removing token prefixes that may cause display issues
  const cleanContent =
    children && typeof children === "string"
      ? children.replace(/token /g, "")
      : children;

  return <code className={`block language-${language}`}>{cleanContent}</code>;
}

// Inline code component
export function InlineCode({ children }) {
  return <code>{children}</code>;
}

// Keep track of whether we've seen an h1
let hasRenderedFirstH1 = false;

// Reset the tracking state
export function resetMDXComponents() {
  hasRenderedFirstH1 = false;
}

// Components map for MDXRemote
export const mdxComponents = {
  pre: (props) => {
    // Extract the children and style directly here to avoid double wrapping
    if (
      props.children &&
      props.children.props &&
      props.children.props.className
    ) {
      // This is a code block, render it directly without the extra pre wrapper
      return <div className="code-block-wrapper">{props.children}</div>;
    }
    return <pre {...props} />;
  },
  code: (props) => {
    const { children, className } = props;
    if (className) {
      return <CodeBlock {...props} />;
    }
    return <InlineCode>{children}</InlineCode>;
  },
  // Skip the first h1 as it's already shown from frontmatter
  h1: (props) => {
    // For blog posts, don't show the first h1 (which is the title)
    // This is a simple approach; each blog post page load resets this
    if (!hasRenderedFirstH1) {
      hasRenderedFirstH1 = true;
      return null; // Skip the first h1
    }

    return <h1 {...props} className="text-3xl font-bold mt-6 mb-4" />;
  },
  h2: (props) => <h2 {...props} className="text-2xl font-bold mt-6 mb-3" />,
  h3: (props) => <h3 {...props} className="text-xl font-bold mt-5 mb-3" />,
  h4: (props) => <h4 {...props} className="text-lg font-bold mt-4 mb-2" />,
  p: (props) => <p {...props} className="my-4" />,
  ul: (props) => <ul {...props} className="list-disc pl-5 my-4" />,
  ol: (props) => <ol {...props} className="list-decimal pl-5 my-4" />,
  li: (props) => <li {...props} className="my-1" />,
  a: (props) => (
    <a
      {...props}
      className="text-emerald-400 hover:text-emerald-300 underline"
    />
  ),
  blockquote: (props) => (
    <blockquote
      {...props}
      className="border-l-4 border-neutral-600 pl-4 italic text-neutral-400 my-4"
    />
  ),
  img: (props) => (
    <img {...props} className="max-w-full h-auto rounded-lg my-4" />
  ),
  table: (props) => (
    <div className="overflow-x-auto my-6">
      <table {...props} className="min-w-full divide-y divide-neutral-700" />
    </div>
  ),
  th: (props) => (
    <th {...props} className="px-4 py-2 bg-neutral-800 font-medium text-left" />
  ),
  td: (props) => (
    <td {...props} className="px-4 py-2 border-t border-neutral-700" />
  ),
};
