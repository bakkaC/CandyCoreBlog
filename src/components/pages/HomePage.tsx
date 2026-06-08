import type { ReactNode } from 'react';
import { BlogMark } from '../home/BlogMark';
import { Categories } from '../home/Categories';
import { LatestPosts } from '../home/LatestPosts';
import { ProfileCard } from '../home/ProfileCard';
import type { HomeCategoryItem, HomePostItem } from '../home/types';
import Noise from '../ui/Noise';

interface HomePageProps {
  baseUrl: string;
  latestPosts: HomePostItem[];
  categories: HomeCategoryItem[];
}

export default function HomePage({
  baseUrl,
  latestPosts,
  categories,
}: HomePageProps): ReactNode {
  return (
    <main className="relative min-h-[calc(100vh-60px)] overflow-hidden bg-slate-50">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.94),rgba(248,250,252,0.8)_34%,rgba(241,245,249,0.9)_72%,rgba(226,232,240,0.94)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.02),transparent_12%,transparent_84%,rgba(15,23,42,0.035))]" />
        <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.18)_0px,rgba(255,255,255,0.18)_1px,transparent_1px,transparent_7px)] opacity-60" />
        <Noise
          patternRefreshInterval={0}
          patternAlpha={9}
          className="mix-blend-screen"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(148,163,184,0.12),transparent_28%),radial-gradient(circle_at_82%_18%,rgba(255,255,255,0.28),transparent_24%),radial-gradient(circle_at_50%_100%,rgba(226,232,240,0.22),transparent_34%)]" />
      </div>
      <section className="relative z-10 px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
        <div className="mx-auto max-w-7xl">
          <div className="relative [--cut-size:72px] md:[--cut-size:88px] lg:[--cut-size:120px]">
            <svg
              aria-hidden="true"
              viewBox="0 0 32 32"
              width="48"
              height="48"
              className="pointer-events-none absolute z-30 text-white"
              style={{
                left: 'min(max(0.5rem, calc(var(--cut-size) * 0.11)), 1rem)',
                top: 'min(max(0.5rem, calc(var(--cut-size) * 0.11)), 1rem)',
                width: 'min(max(3rem, calc(var(--cut-size) * 0.6)), 4.5rem)',
                height: 'min(max(3rem, calc(var(--cut-size) * 0.6)), 4.5rem)',
              }}
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="butt"
              strokeLinejoin="miter"
            >
              <polygon points="1,1 1,23 23,1" fill="currentColor" stroke="black" strokeWidth="0.8" />
            </svg>
            <BlogMark className="pointer-events-none absolute left-22 top-4 z-20 w-28 translate-x-0 text-slate-900 sm:left-26 sm:top-6 sm:w-32 md:left-28 md:top-5 md:w-32 lg:left-36 lg:top-8 lg:w-44" />
            <ProfileCard baseUrl={baseUrl} />
          </div>

          <div className="mt-8 grid gap-8 pt-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <LatestPosts posts={latestPosts} />
            <Categories categories={categories} />
          </div>
        </div>
      </section>
    </main>
  );
}
