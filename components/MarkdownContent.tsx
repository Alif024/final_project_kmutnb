import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/** แสดงข้อความจาก AI โดยไม่อนุญาต HTML ดิบ */
export default function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="space-y-3 break-words leading-7 [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_h1]:font-bold [&_h2]:font-bold [&_h3]:font-bold [&_h1]:mt-4 [&_h2]:mt-4 [&_h3]:mt-4 [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5 [&_li]:my-1 [&_strong]:font-bold [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-slate-200 dark:[&_pre]:bg-slate-950 [&_pre]:p-3 [&_code]:font-mono [&_a]:text-blue-600 dark:[&_a]:text-blue-400 [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_table]:block [&_table]:overflow-x-auto [&_td]:border [&_td]:p-2 [&_th]:border [&_th]:p-2">
      <Markdown remarkPlugins={[remarkGfm]} skipHtml>{content}</Markdown>
    </div>
  );
}
