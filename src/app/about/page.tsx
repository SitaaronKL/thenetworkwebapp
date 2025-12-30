import React from 'react';
import Link from 'next/link';
export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white">
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-6 flex justify-between items-center mix-blend-difference text-white">
        <Link href="/" className="text-xl font-bold font-brand tracking-tighter">
          TheNetwork
        </Link>
        <Link href="/" className="text-sm font-medium hover:opacity-70 transition-opacity">
          Back to Home
        </Link>
      </nav>

      <div className="pt-32 px-6 pb-20 max-w-4xl mx-auto">
        <h1 className="text-5xl md:text-7xl font-bold mb-12 font-brand tracking-tight">
          About TheNetwork
        </h1>

        <div className="space-y-8 text-lg md:text-xl leading-relaxed text-gray-800">
          <p>
            We are building the infrastructure for the next generation of social discovery.
          </p>
          
          <p>
            The internet is overflowing with signals—tiny digital clues about who you are, what you love, and where you belong. 
            Currently, these signals are scattered, trapped in silos, or used solely to serve you ads.
          </p>

          <p>
            We believe these signals should serve <strong>you</strong>.
          </p>

          <p>
            TheNetwork runs on signal intelligence. We connect the dots between your digital life to help you discover 
            people, communities, and opportunities that feel naturally right, not randomly generated.
          </p>

          <p>
            We're starting with a select group of campuses to ensure the density and quality of connections 
            lives up to our promise.
          </p>

          <div className="pt-12">
            <h3 className="text-2xl font-bold mb-4 font-brand">Our Mission</h3>
            <p>
              To replace the noise of the feed with the clarity of connection.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

