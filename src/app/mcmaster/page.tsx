'use client';

import Link from 'next/link';

const THE_NETWORK_SVG = '/mcmaster/TheNetwork.svg'; // -white is empty; use + invert for white on black
const MCMASTER_LOGO_SVG = '/mcmaster/mcmaster-logo.svg';
const APP_ICON_SVG = '/mcmaster/app_icon.svg'; // -white is empty; use + invert for white on black

export default function McMasterGlowdownPage() {
  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden font-sans">

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-5 flex justify-end">
        <Link
          href="/"
          className="text-white/90 hover:text-white text-sm font-medium tracking-wide transition-colors"
        >
          The Network
        </Link>
      </nav>

      <main className="relative z-10 max-w-2xl mx-auto px-6 pt-24 pb-20">
        {/* Hero: app icon center + Introducing TNW + what's good mac! + Fellow Marauder */}
        <header className="text-center mb-16">
          <a href="https://www.instagram.com/join.thenetwork/" target="_blank" rel="noopener noreferrer">
            <img
              src={APP_ICON_SVG}
              alt="The Network"
              className="h-20 md:h-24 w-auto object-contain opacity-95 mx-auto mb-6 brightness-0 invert cursor-pointer hover:opacity-80 transition-opacity"
            />
          </a>
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-white/50 mb-4">
            Introducing TNW
          </p>
          <h1 className="font-brand text-3xl md:text-4xl font-bold tracking-tight text-white mb-3" style={{ letterSpacing: '-0.02em' }}>
            what&apos;s good mac!
          </h1>
          <p className="text-white/70 text-base md:text-lg font-ui">
            fellow marauder here —* hope you&apos;re all doing well.
          </p>
        </header>

        {/* The Network × McMaster — personalized to Mac */}
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-3 mb-12">
          <a href="https://www.instagram.com/join.thenetwork/" target="_blank" rel="noopener noreferrer">
            <img src={THE_NETWORK_SVG} alt="The Network" className="h-8 md:h-10 w-auto object-contain opacity-95 brightness-0 invert cursor-pointer hover:opacity-80 transition-opacity" />
          </a>
        </div>

        {/* Intro */}
        <div className="space-y-6 text-white/80 text-base leading-relaxed font-ui max-w-[65ch] mx-auto mb-16">
          <p>
            last year, i was at a conference in new york. in between talking with a bunch of new faces that covered topics spanning from whether manhattan is actually an island to the collective lack of sleep caused by delayed flights, i found myself drawn to a particular group of people having this one conversation. it was as follows: for the past 15 years, social media has been about likes, comments, and followers, slowly becoming a consumption engine designed to keep you ON the internet and ON your phone.
          </p>
          <p>
            we all collectively got to thinking <em>"man, how cool would it be if we could challenge that?" </em>
            imagine; a platform that understands your real interests from how you actually spend your time online. where your digital presence reflects who you are, not just what you post. where connections are meaningful and your data works for you. that&apos;s what we&apos;re building with The Network.
          </p>
        </div>

        {/* how the internet gets to know you */}
        <section className="mb-16">
          <h2 className="font-brand text-xl md:text-2xl font-bold tracking-tight text-white mb-6" style={{ letterSpacing: '-0.02em' }}>
            how the internet gets to know you
          </h2>
          <p className="text-white/80 text-base leading-relaxed font-ui max-w-[65ch]">
            about a year ago i was introduced to the term &quot;digital DNA.&quot; for those of you who haven&apos;t come across it yet, your digital DNA is like a living web of everything you consume. your tastes, obsessions, and curiosity, all woven together through every click, stream, and scroll across the internet. <strong className="text-white">right now, that identity is scattered across platforms.</strong>
          </p>
        </section>

        {/* our vision */}
        <section className="mb-16">
          <h2 className="font-brand text-xl md:text-2xl font-bold tracking-tight text-white mb-6" style={{ letterSpacing: '-0.02em' }}>
            our vision
          </h2>
          <p className="text-white/80 text-base leading-relaxed font-ui max-w-[65ch]">
            imagine a real-time map of who you are. something built from all the signals you leave behind when watching that random heated rivalry brainrot at 3am (anyone else suddenly super keen to go workout at the pulse?!). <strong className="text-white">we&apos;re not talking about what you say you like, but what your behavior proves you actually love.</strong>
          </p>
        </section>

        {/* why join? */}
        <section className="mb-16">
          <h2 className="font-brand text-xl md:text-2xl font-bold tracking-tight text-white mb-6" style={{ letterSpacing: '-0.02em' }}>
            why join?
          </h2>
          <ul className="list-none p-0 space-y-4 text-white/80 text-base leading-relaxed font-ui max-w-[65ch]">
            <li>
              think of The Network as an extension of your mind...<br /><br />
              we want to help you understand yourself in a world full of noise.<br /><br />
              we want to connect you with communities that share your niche .<br /><br />
              we want to remove all the junk that is keeping the right opportunities out of reach.
            </li>
            <li><strong className="text-white">...ultimately, we want to connect the dots and light up your network so that you can continue to live your best life, both online AND offline.</strong></li>
          </ul>
        </section>

        {/* CTA */}
        <section className="text-center py-8 mb-16">
          <h2 className="font-brand text-xl md:text-2xl font-bold tracking-tight text-white mb-8" style={{ letterSpacing: '-0.02em' }}>
            ready?**
          </h2>
          <Link
            href="/invite/4NA8JW"
            className="inline-block px-10 py-5 rounded-full text-lg font-semibold bg-white text-black hover:bg-gray-100 transition-colors duration-200"
          >
            let&apos;s fkn go
          </Link>
          <a href="https://www.instagram.com/join.thenetwork/" target="_blank" rel="noopener noreferrer">
            <img
              src={APP_ICON_SVG}
              alt="The Network"
              className="h-24 md:h-32 w-auto object-contain opacity-95 mx-auto mt-10 brightness-0 invert cursor-pointer hover:opacity-80 transition-opacity"
            />
          </a>
        </section>

        {/* Footer */}
        <footer className="text-center pt-6 border-t border-white/10">
          <p className="text-white/60 text-sm">© 2026 The Network.</p>
          <p className="text-white/40 text-xs mt-3">*any use of Em Dashes are my own and not written by ChatGPT</p>
          <p className="text-white/40 text-xs mt-1">**coded by vibe and the sheer persistence of a life sci student (im just a giiiiirllll)</p>
        </footer>
      </main>
    </div>
  );
}
