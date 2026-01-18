'use client';

import React, { useEffect, useRef } from 'react';
import Menu from '@/components/Menu';
import styles from './page.module.css';

export default function MsgAriaPage() {
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Adjust rootMargin based on screen size for better mobile experience
        const isMobile = window.innerWidth <= 640;
        const rootMargin = isMobile ? '0px 0px -40px 0px' : '0px 0px -80px 0px';

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add(styles.visible);
                    } else {
                        entry.target.classList.remove(styles.visible);
                    }
                });
            },
            {
                threshold: 0.1,
                rootMargin
            }
        );

        const card = cardRef.current;
        if (card) {
            const elements = card.querySelectorAll(`.${styles.reveal}`);
            elements.forEach((el) => observer.observe(el));
        }

        return () => observer.disconnect();
    }, []);

    return (
        <div className={styles.container}>
            <Menu />

            <div className={styles.memoWrapper}>
                <div className={styles.memoCard} ref={cardRef}>
                    <div className={`${styles.memoHeader} ${styles.reveal}`}>
                        <h1 className={styles.memoTitle}>The Future of ARI</h1>
                    </div>

                    <div className={styles.memoContent}>
                        <p className={styles.reveal}>
                            This is a little memo I'm writing so that our biggest fans have something cool to read.
                        </p>

                        <p className={styles.reveal}>
                            Social media today just sucks, plain and simple – we all know that.
                        </p>

                        <p className={styles.reveal}>
                            They aren't incentivized to show you the people you should talk to, and even if they did, they couldn't.
                        </p>

                        <p className={`${styles.question} ${styles.reveal}`}>Ok so how do we fix that?</p>

                        <h2 className={`${styles.thesisTitle} ${styles.reveal}`}>Our Thesis</h2>

                        <p className={styles.reveal}>
                            Let's look at how community and friends are built in real life.
                        </p>

                        <p className={styles.reveal}>
                            Think about the friends you've already made; you met them at clubs, your dorm, or class. At the root of it all, it was about something you shared – whether it was an interest or a location.
                        </p>

                        <p className={styles.reveal}>
                            But we know forms suck. I could give you a thousand-question form and it still wouldn't capture who you really are – you're way more dimensional than that <span className={styles.emoji}>:)</span>
                        </p>

                        <p className={styles.reveal}>
                            But I would wager that your YouTube and your TikTok, they probably know you really well.
                        </p>

                        <p className={styles.reveal}>
                            They are Skinner boxes that our generation has been feeding our personalities and lives into. You watch what you like, and keep only really watching that. But that implicitly tells who you are, your interests.
                        </p>

                        <p className={styles.reveal}>
                            I believe that by connecting you to people like that, we build a network who you can really talk to.
                        </p>

                        <p className={styles.reveal}>
                            I know that as college (or really the world) gets lonelier and lonelier, something like The Network becomes even more necessary.
                        </p>

                        <div className={`${styles.signature} ${styles.reveal}`}>
                            <span className={styles.signatureLine}></span>
                            <span className={styles.signatureText}>The Network Team</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
