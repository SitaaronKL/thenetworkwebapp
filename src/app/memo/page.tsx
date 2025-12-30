'use client';

import Threads from '@/components/Threads';

export default function MemoPage() {
  return (
    <main className="memo-page min-h-screen flex overflow-hidden bg-black text-white">
      {/* Left Sidebar - Threads Animation (hidden on mobile) */}
      <div className="w-third h-screen relative hide-on-mobile bg-black">
        <Threads
          color={[1, 1, 1]}
          amplitude={2}
          distance={0}
          enableMouseInteraction={true}
        />
      </div>
      
      {/* Right Side - Content */}
      <div className="w-two-thirds w-full-mobile h-screen overflow-y-auto px-6 py-4 bg-black">
        <div className="max-w-3xl text-white mt-250">
          <div className="memo-logo-container">
            <h1 className="memo-logo font-brand">TheNetwork</h1>
          </div>
          {/* Top Spacing */}
          <div style={{height: '160px'}}></div>
          
          {/* Large Spacing */}
          <div style={{height: '410px'}}></div>

          {/* Custom Memo Copy */}
          <section className="mb-8">
            <div className="space-y-4 text-base leading-normal text-gray-200 font-ui">
              <p>If you found this easter egg, <span className="font-semibold">CONGRATULATIONS!!!</span> You’re a real one.</p>
              <p>This is a little memo I’m writing in so that our biggest fans have something cool to read.</p>
              <p>Social media today just sucks, plain and simple - we all know that.</p>
              <p>They aren’t incentivized to show you the people you should talk to and even if they did they couldn’t.</p>
              <p>Ok so how do we fix that?</p>
              <h3 className="text-xl font-bold mt-6">Our Thesis</h3>
              <p>Let’s look at how community and friends are built in real life.</p>
              <p>Think about the friends you’ve already made; you met them at clubs, your dorm, or class.</p>
              <p>At the root of it all, it was about something you shared - whether it was an interest or a location.</p>
              <p>But we know forms suck. I could give you a thousand-question form and it still wouldn’t capture who <span className="font-semibold">you</span> really are—you're way more dimensional than that :)</p>
              <p>But I would wager that your YouTube and your TikTok, they probably know you really well.</p>
              <p>They are <a className="underline decoration-white/40 hover:decoration-white" href="https://en.wikipedia.org/wiki/Operant_conditioning_chamber" target="_blank" rel="noreferrer">Skinner boxes</a> that our generation has been feeding our personalities and lives into.</p>
              <p>You watch what you like, and keep only really watching that.</p>
              <p>But that implicitly tells who you are, your interests.</p>
              <p>I believe that by connecting you to people like that. We build a network who you can really talk to.</p>
              <p>I believe that as college (or really the world) gets lonelier and lonelier something like the Network becomes even more necessary.</p>
            </div>
          </section>

          {/* Graphical Representations Note */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Just some graphical representations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="text-center">
                <h3 className="font-bold text-gray-200 mb-3 text-base">What social media is currently built on:</h3>
                <div className="border border-white/15 rounded-lg p-2 bg-white/5">
                  <img 
                    src="/2dgraph.png" 
                    alt="2D representation of current AI data - surface-level data, surveys, and shallow behavioral indicators"
                    className="w-full h-auto rounded"
                  />
                </div>
                <p className="text-gray-400 text-sm mt-2">2D surface-level data, surveys, and friends of friends bullshit</p>
              </div>
              <div className="text-center">
                <h3 className="font-bold text-gray-200 mb-3 text-base">What we're building:</h3>
                <div className="border border-white/15 rounded-lg p-2 bg-white/5">
                  <img 
                    src="/3dgraph.png" 
                    alt="3D representation of future AI data - deep behavioral data layer with subconscious pattern recognition"
                    className="w-full h-auto rounded"
                  />
                </div>
                <p className="text-gray-400 text-sm mt-2">Content &gt; Interests &gt; People &gt; Community</p>
              </div>
            </div>
          </section>


          {/* (Removed additional sections per request; keeping only the two graphs below) */}

          {/* Our First Product Button to be added later
          <div className="my-20 text-center">
            <a 
              href="/phtogrph" 
              className="text-xl font-semibold text-white hover:text-orange-200 transition-colors duration-300 border-b-2 border-white hover:border-orange-200 pb-1"
            >
              Our First Product
            </a>
          </div> */}

          {/* Footer */}
          <footer className="site-footer mt-16">
            <a href="/privacy">Privacy</a>
            <span> · </span>
            <a href="/terms">Terms</a>
          </footer>
        </div>
      </div>
    </main>
  );
}
