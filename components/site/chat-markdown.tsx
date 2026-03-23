import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type ChatMarkdownProps = {
  content: string;
};

export function ChatMarkdown({ content }: ChatMarkdownProps) {
  return (
    <div className="chat-markdown prose-academic max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a({ node: _node, className, ...props }) {
            return <a {...props} className={className ? `${className} break-words` : "break-words"} />;
          },
          table({ node: _node, className, children, ...props }) {
            return (
              <div className="my-4 overflow-x-auto">
                <table {...props} className={className}>
                  {children}
                </table>
              </div>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
