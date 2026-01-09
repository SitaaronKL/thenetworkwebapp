'use client';

import React from 'react';
import Menu from '@/components/Menu';
import styles from './page.module.css';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import MeetNetworkView from '@/components/MeetNetwork/MeetNetworkView';

export default function MsgAriaPage() {
    return (
        <div className={styles.container}>
            <Menu />

            <div className={styles.memoWrapper}>
                <Tabs defaultValue="memo" className="w-full max-w-[800px]">
                    <div className="flex justify-center mb-8">
                        <TabsList className="grid w-[400px] grid-cols-1 rounded-full p-1 bg-muted/50 backdrop-blur-sm border border-border/50">
                            <TabsTrigger value="memo" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm">Memo</TabsTrigger>
                            {/* <TabsTrigger value="meet" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm">Meet Network</TabsTrigger> */}
                        </TabsList>
                    </div>

                    <TabsContent value="memo" className="mt-0">
                        <div className={styles.memoCard}>
                            <div className={styles.memoHeader}>
                                <div className={styles.memoLabel}> MEMO</div>
                                <h1 className={styles.memoTitle}>The Future of ARI</h1>
                            </div>

                            <div className={styles.memoContent}>
                                <p className={styles.congratsText}>
                                </p>

                                <p>
                                    This is a little memo I'm writing so that our biggest fans have something cool to read.
                                </p>

                                <p>
                                    Social media today just sucks, plain and simple – we all know that.
                                </p>

                                <p>
                                    They aren't incentivized to show you the people you should talk to, and even if they did, they couldn't.
                                </p>

                                <p className={styles.question}>Ok so how do we fix that?</p>

                                <h2 className={styles.thesisTitle}>Our Thesis</h2>

                                <p>
                                    Let's look at how community and friends are built in real life.
                                </p>

                                <p>
                                    Think about the friends you've already made; you met them at clubs, your dorm, or class. At the root of it all, it was about something you shared – whether it was an interest or a location.
                                </p>

                                <p>
                                    But we know forms suck. I could give you a thousand-question form and it still wouldn't capture who you really are – you're way more dimensional than that <span className={styles.emoji}>:)</span>
                                </p>

                                <p>
                                    But I would wager that your YouTube and your TikTok, they probably know you really well.
                                </p>

                                <p>
                                    They are Skinner boxes that our generation has been feeding our personalities and lives into. You watch what you like, and keep only really watching that. But that implicitly tells who you are, your interests.
                                </p>

                                <p>
                                    I believe that by connecting you to people like that, we build a network who you can really talk to.
                                </p>

                                <p>
                                    I know that as college (or really the world) gets lonelier and lonelier, something like The Network becomes even more necessary.
                                </p>

                                <div className={styles.signature}>
                                    <span className={styles.signatureLine}></span>
                                    <span className={styles.signatureText}>The Network Team</span>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    {/* <TabsContent value="meet" className="mt-0">
                        <MeetNetworkView />
                    </TabsContent> */}
                </Tabs>
            </div>
        </div>
    );
}
