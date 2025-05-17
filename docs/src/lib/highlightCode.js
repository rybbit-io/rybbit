"use client";

export function highlightCode() {
  // This function will run on the client side
  if (typeof window === "undefined") return;

  const codeBlocks = document.querySelectorAll("pre code");

  codeBlocks.forEach((block) => {
    // Get the language class if it exists
    const languageClass = Array.from(block.classList).find((cls) =>
      cls.startsWith("language-")
    );

    if (!languageClass) return;

    const language = languageClass.replace("language-", "");

    // Simple syntax highlighting based on patterns
    let html = block.innerHTML;

    // Replace all instances of 'class="token token' with just 'class="'
    html = html.replace(/class="token token/g, 'class="');

    // Replace all instances of nested tokens
    html = html.replace(/class="token/g, 'class="');

    // Comments
    html = html.replace(/(\/\/.*)/g, '<span class="comment">$1</span>');
    html = html.replace(
      /(\/\*[\s\S]*?\*\/)/g,
      '<span class="comment">$1</span>'
    );

    // Strings
    html = html.replace(
      /(['"`])(?:(?=(\\?))\2.)*?\1/g,
      '<span class="string">$&</span>'
    );

    // Keywords
    const keywords = [
      "function",
      "const",
      "let",
      "var",
      "if",
      "else",
      "for",
      "while",
      "return",
      "import",
      "export",
      "from",
      "class",
      "extends",
      "async",
      "await",
      "try",
      "catch",
      "throw",
      "new",
      "this",
      "super",
      "static",
      "true",
      "false",
    ];

    keywords.forEach((keyword) => {
      const regex = new RegExp(`\\b${keyword}\\b`, "g");
      html = html.replace(regex, `<span class="keyword">${keyword}</span>`);
    });

    // Numbers
    html = html.replace(
      /\b(\d+(?:\.\d+)?)\b/g,
      '<span class="number">$1</span>'
    );

    // Tags for HTML
    if (language === "html" || language === "xml") {
      html = html.replace(
        /(&lt;\/?[a-zA-Z0-9-]+)(?=\s|&gt;)/g,
        '<span class="tag">$1</span>'
      );
      html = html.replace(
        /([a-zA-Z0-9-]+)=(?=["'])/g,
        '<span class="attr-name">$1</span>='
      );
    }

    block.innerHTML = html;
  });
}

// Simple function to tokenize code - can be used before rendering
export function tokenizeCode(code, language) {
  if (!code) return code;

  // Simple tokenization for demonstration
  let tokenized = code;

  // Comments
  tokenized = tokenized.replace(/(\/\/.*)/g, '<span class="comment">$1</span>');
  tokenized = tokenized.replace(
    /(\/\*[\s\S]*?\*\/)/g,
    '<span class="comment">$1</span>'
  );

  // Strings
  tokenized = tokenized.replace(
    /(['"`])(?:(?=(\\?))\2.)*?\1/g,
    '<span class="string">$&</span>'
  );

  // Keywords
  const keywords = [
    "function",
    "const",
    "let",
    "var",
    "if",
    "else",
    "for",
    "while",
    "return",
    "import",
    "export",
    "from",
    "class",
    "extends",
    "async",
    "await",
    "try",
    "catch",
    "throw",
    "new",
    "this",
    "super",
    "static",
    "true",
    "false",
  ];

  keywords.forEach((keyword) => {
    const regex = new RegExp(`\\b${keyword}\\b`, "g");
    tokenized = tokenized.replace(
      regex,
      `<span class="keyword">${keyword}</span>`
    );
  });

  // Numbers
  tokenized = tokenized.replace(
    /\b(\d+(?:\.\d+)?)\b/g,
    '<span class="number">$1</span>'
  );

  return tokenized;
}
