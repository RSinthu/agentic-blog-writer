import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import { apiUrl } from "@/lib/api";

// Raw HTML in the model's output is not rendered (no rehype-raw), so the article can't inject markup.
const components: Components = {
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  ),
  img: ({ src, alt }) =>
    typeof src === "string" ? (
      // eslint-disable-next-line @next/next/no-img-element -- generated images live on the API host
      <img src={apiUrl(src)} alt={alt ?? ""} loading="lazy" />
    ) : null,
};

export function MarkdownView({ markdown }: { markdown: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {markdown}
    </ReactMarkdown>
  );
}
