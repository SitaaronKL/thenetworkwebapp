"use client";

import { useEffect, useRef, useState } from "react";

type FakeEntry = {
  name: string;
  location?: string;
};

const FAKE_MEMBERS: FakeEntry[] = [
  { name: "Sarah", location: "SF" },
  { name: "Alex", location: "NY" },
  { name: "Priya", location: "LA" },
  { name: "Marcus", location: "Austin" },
  { name: "Lena" },
  { name: "Isabella", location: "Chicago" },
  { name: "Noah", location: "Boston" },
  { name: "Avery" },
  { name: "Lucas", location: "Seattle" },
  { name: "John", location: "Manhattan" },
  { name: "Sofia", location: "NYC" },
  { name: "Abhiram", location: "SOHO" },
  { name: "Sienna", location: "NJ" },
  { name: "Ari" },
  { name: "Mia", location: "Philidelphia" },
  { name: "Zach", location: "Dallas" },
  { name: "Bryn" },
  { name: "Trevor", location: "Brooklyn" },
];

const getRandomDelay = () => 20000 + Math.random() * 20000; // 20–40s

export default function JoinPopup() {
  const [message, setMessage] = useState<string>("");
  const [visible, setVisible] = useState(false);
  const showTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const schedulePopup = () => {
      showTimeoutRef.current = setTimeout(() => {
        const entry =
          FAKE_MEMBERS[Math.floor(Math.random() * FAKE_MEMBERS.length)];
        const nextMessage = entry.location
          ? `${entry.name} from ${entry.location} just joined.`
          : `${entry.name} just joined TheNetwork.`;

        setMessage(nextMessage);
        setVisible(true);

        hideTimeoutRef.current = setTimeout(() => {
          setVisible(false);
          schedulePopup();
        }, 3000);
      }, getRandomDelay());
    };

    schedulePopup();

    return () => {
      if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-6 z-50 flex justify-center px-4 sm:px-0">
      <div
        className={`rounded-xl bg-black px-4 py-3 text-sm font-medium text-white shadow-2xl transition-all duration-500 ease-out ${
          visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
        }`}
        aria-live="polite"
      >
        {message}
      </div>
    </div>
  );
}
