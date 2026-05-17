import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { posts, getPost, formatDate } from "@/lib/blog";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return posts.map(p => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return {
    title: `${post.title} — BuffetFindr Blog`,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const otherPosts = posts.filter(p => p.slug !== slug).slice(0, 3);

  return (
    <div className="min-h-screen bg-[#FFF8F2]">
      {/* Header */}
      <div className="border-b border-[#EDE0D4] bg-white sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.png" alt="BuffetFindr" className="w-7 h-7 rounded-lg" />
            <span className="font-bold text-sm text-[#1C0A00]">BuffetFindr</span>
          </Link>
          <Link href="/blog" className="text-sm text-[#8C6B55] hover:text-[#C94A1F] transition-colors">
            ← All Articles
          </Link>
        </div>
      </div>

      {/* Article */}
      <article className="max-w-3xl mx-auto px-6 py-12">
        {/* Meta */}
        <div className="mb-8">
          <span className="inline-block rounded-full bg-[#FFF3EC] text-[#C94A1F] px-3 py-1 text-xs font-semibold mb-4">
            {post.category}
          </span>
          <h1 className="text-4xl font-bold text-[#1C0A00] leading-tight mb-4">
            {post.title}
          </h1>
          <p className="text-lg text-[#8C6B55] leading-relaxed mb-6">
            {post.description}
          </p>
          <div className="flex items-center gap-3 text-sm text-[#8C6B55] pb-6 border-b border-[#EDE0D4]">
            <span>{formatDate(post.date)}</span>
            <span>·</span>
            <span>{post.readTime}</span>
          </div>
        </div>

        {/* Body */}
        <div
          className="prose prose-lg max-w-none
            prose-headings:text-[#1C0A00] prose-headings:font-bold
            prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
            prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
            prose-p:text-[#3D1F0A] prose-p:leading-relaxed prose-p:mb-4
            prose-strong:text-[#1C0A00]
            prose-ul:text-[#3D1F0A] prose-li:mb-1
            prose-a:text-[#C94A1F] prose-a:no-underline hover:prose-a:underline"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* CTA */}
        <div className="mt-12 rounded-2xl bg-gradient-to-br from-[#C94A1F] to-[#8B2110] p-8 text-white text-center">
          <p className="text-2xl font-bold mb-2">Find an Indian buffet near you</p>
          <p className="text-white/80 mb-6">252+ verified buffets across DMV, Boston, NYC, and more.</p>
          <Link
            href="/"
            className="inline-block rounded-xl bg-white text-[#C94A1F] font-bold px-6 py-3 hover:bg-white/90 transition-colors"
          >
            Open BuffetFindr →
          </Link>
        </div>
      </article>

      {/* Related posts */}
      {otherPosts.length > 0 && (
        <div className="max-w-3xl mx-auto px-6 pb-16">
          <h2 className="text-xl font-bold text-[#1C0A00] mb-6">More from the blog</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {otherPosts.map(p => (
              <Link
                key={p.slug}
                href={`/blog/${p.slug}`}
                className="group rounded-2xl bg-white border border-[#EDE0D4] p-5 hover:shadow-md transition-shadow"
              >
                <p className="text-xs text-[#C94A1F] font-semibold mb-2">{p.category}</p>
                <h3 className="text-sm font-bold text-[#1C0A00] leading-snug group-hover:text-[#C94A1F] transition-colors line-clamp-2">
                  {p.title}
                </h3>
                <p className="text-xs text-[#8C6B55] mt-2">{p.readTime}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-[#EDE0D4]">
        <div className="max-w-3xl mx-auto px-6 py-6 text-center text-xs text-[#8C6B55]">
          © {new Date().getFullYear()} BuffetFindr ·{" "}
          <Link href="/" className="underline">Find Buffets</Link> ·{" "}
          <Link href="/blog" className="underline">Blog</Link> ·{" "}
          <Link href="/privacy" className="underline">Privacy</Link>
        </div>
      </div>
    </div>
  );
}
