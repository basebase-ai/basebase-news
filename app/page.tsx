'use client';

import Link from 'next/link';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faNewspaper, faUserFriends, faLightbulb, faComments, faStar } from '@fortawesome/free-solid-svg-icons';

export default function LandingPage() {
  const ctaHref = '/auth/signin';
  const ctaText = 'Start Reading - It\'s Free';

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white z-10 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Image
              src="/assets/images/logo_150x150.png"
              alt="NewsWithFriends"
              width={40}
              height={40}
              className="w-10 h-10"
            />
            <Image
              src="/assets/images/logotype_black.png"
              alt="NewsWithFriends"
              width={180}
              height={36}
              className="h-9 w-auto"
            />
          </div>
          <Link
            href={ctaHref}
            className="inline-block bg-white text-primary border-2 border-primary hover:bg-primary hover:text-white font-bold py-2 px-6 rounded-lg text-sm transition-colors"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-gray-900 text-white pt-32 pb-24">
        <div className="absolute inset-0 overflow-hidden">
          <Image
            src="/assets/images/hero.avif"
            alt="People reading and discussing news on phones"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gray-900/70" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Social news discovery.</h1>
            <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto">
              Discover new articles from friends every day that you never would have found otherwise.
            </p>
            <Link 
              href={ctaHref}
              className="inline-block bg-primary hover:bg-primary-dark text-white font-bold py-3 px-8 rounded-lg text-lg transition-colors"
            >
              {ctaText}
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-sm text-center">
              <div className="w-16 h-16 rounded-full mx-auto mb-4 overflow-hidden">
                <Image
                  src="/assets/images/dan.jpg"
                  alt="Dan B."
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex justify-center mb-3">
                {[...Array(5)].map((_, i) => (
                  <FontAwesomeIcon key={i} icon={faStar} className="h-4 w-4 text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-600 mb-4 italic">
                &ldquo;This app completely changed how I discover news. I found so many fascinating articles through my friends that I never would have seen on my own.&rdquo;
              </p>
              <p className="font-semibold text-gray-900">Dan B.</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm text-center">
              <div className="w-16 h-16 rounded-full mx-auto mb-4 overflow-hidden">
                <Image
                  src="/assets/images/heather.png"
                  alt="Heather H."
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex justify-center mb-3">
                {[...Array(5)].map((_, i) => (
                  <FontAwesomeIcon key={i} icon={faStar} className="h-4 w-4 text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-600 mb-4 italic">
                &ldquo;Love seeing what my smart friends are reading! It&apos;s like having a personalized news curator that actually understands my interests.&rdquo;
              </p>
              <p className="font-semibold text-gray-900">Heather H.</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm text-center">
              <div className="w-16 h-16 rounded-full mx-auto mb-4 overflow-hidden">
                <Image
                  src="/assets/images/shalom.png"
                  alt="Shalom O."
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex justify-center mb-3">
                {[...Array(5)].map((_, i) => (
                  <FontAwesomeIcon key={i} icon={faStar} className="h-4 w-4 text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-600 mb-4 italic">
                &ldquo;Finally, a way to break out of my news bubble! The articles my friends share have opened my eyes to perspectives I hadn&apos;t considered.&rdquo;
              </p>
              <p className="font-semibold text-gray-900">Shalom O.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <FontAwesomeIcon icon={faNewspaper} className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Diverse Perspectives</h3>
              <p className="text-gray-600">Discover new sources and viewpoints that challenge and expand your understanding.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <FontAwesomeIcon icon={faUserFriends} className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Build Connections</h3>
              <p className="text-gray-600">Share articles and insights with friends, creating deeper bonds through meaningful discussions.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <FontAwesomeIcon icon={faComments} className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Engage in Discussion</h3>
              <p className="text-gray-600">Join thoughtful conversations about current events with a community that values diverse opinions.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-primary mb-4">1</div>
              <h3 className="text-xl font-semibold mb-2">Sign Up</h3>
              <p className="text-gray-600">Create your free account and start exploring news from trusted sources.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-primary mb-4">2</div>
              <h3 className="text-xl font-semibold mb-2">Connect</h3>
              <p className="text-gray-600">Find friends and follow their reading lists and recommendations.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-primary mb-4">3</div>
              <h3 className="text-xl font-semibold mb-2">Engage</h3>
              <p className="text-gray-600">Share articles, discuss insights, and broaden your perspective.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Ready to transform your news experience?</h2>
            <p className="text-gray-300 mb-8">Join thousands of readers discovering news together. Always free.</p>
            <Link 
              href={ctaHref}
              className="inline-block bg-primary hover:bg-primary-dark text-white font-bold py-3 px-8 rounded-lg text-lg transition-colors"
            >
              Start Reading Now
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
} 