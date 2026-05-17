import type { Metadata } from "next";
import Link from "next/link";
import { posts, formatDate } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog — BuffetFindr | Indian Food, Buffets & Culture",
  description: "Guides, histories, and deep dives on Indian buffets, cuisine, and culture across America. From butter chicken to biryani — learn, explore, and eat better.",
};

const CATEGORY_COLORS: Record<string, string> = {
  "History":         "bg-amber-50 text-amber-700",
  "Food & Culture":  "bg-orange-50 text-orange-700",
  "Food Guide":      "bg-red-50 text-red-700",
  "Local Guide":     "bg-green-50 text-green-700",
  "Food Education":  "bg-blue-50 text-blue-700",
  "Tips & Tricks":   "bg-purple-50 text-purple-700",
  "Health & Wellness": "bg-teal-50 text-teal-700",
};

export default function BlogPage() {
  const featured = posts[0];
  const rest = posts.slice(1);

  return (
    <div className="min-h-screen bg-[#FFF8F2]">
      {/* Header */}
      <div className="border-b border-[#EDE0D4] bg-white">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.png" alt="BuffetFindr" className="w-9 h-9 rounded-xl" />
            <span className="font-bold text-[#1C0A00]">BuffetFindr</span>
          </Link>
          <Link href="/" className="text-sm text-[#C94A1F] font-semibold hover:underline">
            Find Buffets →
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Page title */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-[#1C0A00] mb-2">The BuffetFindr Blog</h1>
          <p className="text-lg text-[#8C6B55]">
            Everything you need to know about Indian food, buffets, and culture in America.
          </p>
        </div>

        {/* Featured post */}
        <Link href={`/blog/${featured.slug}`} className="group block mb-12">
          <div className="rounded-3xl bg-gradient-to-br from-[#C94A1F] to-[#8B2110] p-8 text-white hover:opacity-95 transition-opacity">
            <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold mb-4">
              {featured.category}
            </span>
            <h2 className="text-3xl font-bold mb-3 leading-tight group-hover:underline decoration-white/60">
              {featured.title}
            </h2>
            <p className="text-white/80 text-base leading-relaxed mb-4 max-w-2xl">
              {featured.description}
            </p>
            <div className="flex items-center gap-3 text-white/60 text-sm">
              <span>{formatDate(featured.date)}</span>
              <span>·</span>
              <span>{featured.readTime}</span>
            </div>
          </div>
        </Link>

        {/* Article grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rest.map(post => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group flex flex-col bg-white rounded-2xl border border-[#EDE0D4] p-6 hover:shadow-lg transition-shadow"
            >
              <span className={`self-start rounded-full px-2.5 py-0.5 text-xs font-semibold mb-3 ${CATEGORY_COLORS[post.category] ?? "bg-gray-100 text-gray-600"}`}>
                {post.category}
              </span>
              <h2 className="text-base font-bold text-[#1C0A00] leading-snug mb-2 group-hover:text-[#C94A1F] transition-colors">
                {post.title}
              </h2>
              <p className="text-sm text-[#8C6B55] leading-relaxed flex-1 line-clamp-3">
                {post.description}
              </p>
              <div className="flex items-center gap-2 text-xs text-[#8C6B55] mt-4 pt-4 border-t border-[#EDE0D4]">
                <span>{formatDate(post.date)}</span>
                <span>·</span>
                <span>{post.readTime}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-[#EDE0D4] mt-12">
        <div className="max-w-5xl mx-auto px-6 py-6 text-center text-xs text-[#8C6B55]">
          © {new Date().getFullYear()} BuffetFindr ·{" "}
          <Link href="/" className="underline">Find Buffets</Link> ·{" "}
          <Link href="/privacy" className="underline">Privacy</Link>
        </div>
      </div>
    </div>
  );
}
