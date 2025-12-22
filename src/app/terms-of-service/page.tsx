'use client';

import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function TermsOfServicePage() {
    const router = useRouter();

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                {/* Header */}
                <div className={styles.header}>
                    <button 
                        className={styles.backButton}
                        onClick={() => router.back()}
                        aria-label="Go back"
                    >
                        ← Back
                    </button>
                    <h1 className={styles.title}>Terms of Service</h1>
                    <p className={styles.lastUpdated}>Last Updated: October 2025</p>
                </div>

                {/* Company Info */}
                <div className={styles.intro}>
                    <p className={styles.companyName}>
                        <strong>Company:</strong> TheNetwork Labs, Inc. ("TheNetwork," "we," "us," or "our")
                    </p>
                    <p className={styles.introText}>
                        <strong>Services:</strong> Our websites, apps (including Asteri), and related services, features, and tools (collectively, the "Services").
                    </p>
                    <p className={styles.introText}>
                        <strong>Effective Date:</strong> These Terms are effective when you access or use the Services.
                    </p>
                    <p className={styles.introText}>
                        By accessing or using the Services, you agree to these Terms and acknowledge our Privacy Policy. If you do not agree, do not use the Services.
                    </p>
                </div>

                {/* Main Content */}
                <div className={styles.sections}>
                    {/* Section 1 */}
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>1. About TheNetwork</h2>
                        <p className={styles.sectionText}>
                            TheNetwork builds consumer software designed to help users connect, express, and organize preferences through 
                            memory-driven personalization. The Services may include web applications, mobile apps, APIs, and experimental features.
                        </p>
                    </section>

                    {/* Section 2 */}
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>2. Eligibility</h2>
                        <p className={styles.sectionText}>
                            You must be at least 13 years old to use the Services (or 16 if you reside in the European Economic Area/United 
                            Kingdom, or a higher age if required by your local law). By using the Services, you represent that you meet the 
                            age requirement and have the legal capacity to enter into these Terms.
                        </p>
                        <p className={styles.sectionText}>
                            If you are using the Services on behalf of an organization, you represent that you are authorized to accept these 
                            Terms on that organization's behalf.
                        </p>
                    </section>

                    {/* Section 3 */}
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>3. Accounts, Authentication, and Security</h2>
                        
                        <h3 className={styles.subsectionTitle}>3.1 Account Creation</h3>
                        <p className={styles.sectionText}>
                            You may need an account to access certain features. You agree to:
                        </p>
                        <ul className={styles.list}>
                            <li>provide accurate and current information,</li>
                            <li>keep your information updated, and</li>
                            <li>maintain the confidentiality of your login credentials.</li>
                        </ul>

                        <h3 className={styles.subsectionTitle}>3.2 Account Responsibility</h3>
                        <p className={styles.sectionText}>
                            You are responsible for all activity that occurs under your account. If you believe your account has been compromised, 
                            notify us promptly at <a href="mailto:support@thenetwork.life" className={styles.link}>support@thenetwork.life</a>.
                        </p>

                        <h3 className={styles.subsectionTitle}>3.3 Suspensions and Safety</h3>
                        <p className={styles.sectionText}>
                            We may suspend or restrict access to the Services to protect users, the platform, or the public, including to 
                            investigate suspected abuse, fraud, or security threats.
                        </p>
                    </section>

                    {/* Section 4 */}
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>4. Your Use of the Services</h2>
                        
                        <h3 className={styles.subsectionTitle}>4.1 License to Use</h3>
                        <p className={styles.sectionText}>
                            Subject to these Terms, we grant you a limited, non-exclusive, non-transferable, revocable license to access and 
                            use the Services for your personal, non-commercial use (unless we explicitly allow otherwise).
                        </p>

                        <h3 className={styles.subsectionTitle}>4.2 Acceptable Use</h3>
                        <p className={styles.sectionText}>You agree not to:</p>
                        <ul className={styles.list}>
                            <li>use the Services for illegal, harmful, or abusive activities;</li>
                            <li>harass, threaten, defame, or exploit others;</li>
                            <li>attempt to gain unauthorized access to accounts, systems, or data;</li>
                            <li>interfere with or disrupt the Services (including security or access controls);</li>
                            <li>reverse engineer, decompile, or attempt to extract source code (except where prohibited by law);</li>
                            <li>use automated scripts or scraping that overwhelms or bypasses rate limits (unless explicitly permitted);</li>
                            <li>upload, share, or transmit content that infringes rights, violates laws, or contains malware.</li>
                        </ul>

                        <h3 className={styles.subsectionTitle}>4.3 Enforcement</h3>
                        <p className={styles.sectionText}>
                            If you violate these Terms, we may remove content, limit features, suspend your account, or terminate access.
                        </p>
                    </section>

                    {/* Section 5 */}
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>5. Integrations and Third-Party Services (Including YouTube)</h2>
                        
                        <h3 className={styles.subsectionTitle}>5.1 Third-Party Services</h3>
                        <p className={styles.sectionText}>
                            The Services may allow you to connect third-party accounts (e.g., YouTube, TikTok, Pinterest). If you connect a 
                            third-party service, you authorize us to access and process data from that service as described in our Privacy 
                            Policy and as allowed by the permissions you grant.
                        </p>

                        <h3 className={styles.subsectionTitle}>5.2 YouTube Terms</h3>
                        <p className={styles.sectionText}>
                            If you use features that access YouTube data, you also agree to comply with YouTube's Terms of Service (and any 
                            applicable YouTube API terms and policies). YouTube is a third-party service and is not controlled by TheNetwork.
                        </p>

                        <h3 className={styles.subsectionTitle}>5.3 No Password Collection</h3>
                        <p className={styles.sectionText}>
                            We do not collect or store your third-party platform passwords.
                        </p>

                        <h3 className={styles.subsectionTitle}>5.4 Revoking Access</h3>
                        <p className={styles.sectionText}>
                            You can revoke a third-party connection (including YouTube) at any time through your TheNetwork settings and/or 
                            through the third-party provider's account permissions settings. After revocation, we stop fetching new data from 
                            that provider, subject to our Privacy Policy and retention practices.
                        </p>

                        <h3 className={styles.subsectionTitle}>5.5 Third-Party Responsibility</h3>
                        <p className={styles.sectionText}>
                            We are not responsible for third-party services, including their content, availability, policies, or actions.
                        </p>
                    </section>

                    {/* Section 6 */}
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>6. User Content</h2>
                        <p className={styles.sectionText}>
                            "User Content" means text, images, messages, files, links, and other content you submit, upload, or share through 
                            the Services.
                        </p>

                        <h3 className={styles.subsectionTitle}>6.1 Ownership</h3>
                        <p className={styles.sectionText}>
                            You retain ownership of your User Content as between you and TheNetwork.
                        </p>

                        <h3 className={styles.subsectionTitle}>6.2 License to Operate the Services</h3>
                        <p className={styles.sectionText}>
                            You grant TheNetwork a worldwide, non-exclusive, royalty-free license to host, store, reproduce, process, display, 
                            and transmit your User Content only as needed to provide, maintain, and improve the Services, operate features you 
                            request (including personalization), and comply with law.
                        </p>
                        <p className={styles.sectionText}>
                            This license ends when your User Content is deleted from the Services, except to the extent:
                        </p>
                        <ul className={styles.list}>
                            <li>we must retain it for legal compliance, security, dispute resolution, or enforcement, or</li>
                            <li>it has been incorporated into aggregated or de-identified analytics (where permitted by law and described in the Privacy Policy).</li>
                        </ul>

                        <h3 className={styles.subsectionTitle}>6.3 Your Responsibilities for User Content</h3>
                        <p className={styles.sectionText}>You represent and warrant that:</p>
                        <ul className={styles.list}>
                            <li>you have the rights to submit your User Content,</li>
                            <li>your User Content does not violate law or third-party rights, and</li>
                            <li>you will not submit content that is malicious, deceptive, or abusive.</li>
                        </ul>

                        <h3 className={styles.subsectionTitle}>6.4 Content Moderation</h3>
                        <p className={styles.sectionText}>
                            We may remove or restrict User Content that violates these Terms, our policies, or applicable law.
                        </p>
                    </section>

                    {/* Section 7 */}
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>7. Prohibited Sensitive Misuse</h2>
                        <p className={styles.sectionText}>You agree not to use the Services to:</p>
                        <ul className={styles.list}>
                            <li>collect, store, or disclose someone else's personal data without authorization;</li>
                            <li>facilitate stalking, doxxing, or harassment;</li>
                            <li>circumvent privacy protections or platform safeguards;</li>
                            <li>attempt to obtain or infer highly sensitive attributes about others without lawful basis.</li>
                        </ul>
                    </section>

                    {/* Section 8 */}
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>8. Intellectual Property</h2>
                        
                        <h3 className={styles.subsectionTitle}>8.1 TheNetwork Property</h3>
                        <p className={styles.sectionText}>
                            The Services, including software, models, algorithms, designs, trademarks, and all related intellectual property, 
                            are owned by TheNetwork or its licensors and are protected by applicable laws.
                        </p>
                        <p className={styles.sectionText}>
                            Except for the limited license in Section 4, nothing in these Terms grants you any right to use TheNetwork's 
                            branding, logos, or proprietary materials without permission.
                        </p>

                        <h3 className={styles.subsectionTitle}>8.2 Feedback</h3>
                        <p className={styles.sectionText}>
                            If you submit feedback or suggestions, you grant us the right to use them without restriction or compensation.
                        </p>
                    </section>

                    {/* Section 9 */}
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>9. Paid Features (If Applicable)</h2>
                        <p className={styles.sectionText}>
                            If the Services include paid features, subscriptions, or purchases:
                        </p>
                        <ul className={styles.list}>
                            <li>pricing, billing frequency, and renewal terms will be disclosed at purchase;</li>
                            <li>taxes may apply;</li>
                            <li>charges are generally non-refundable except where required by law or stated otherwise.</li>
                        </ul>
                    </section>

                    {/* Section 10 */}
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>10. Beta / Experimental Features</h2>
                        <p className={styles.sectionText}>
                            We may release beta or experimental features. These features may change, be removed, or be unstable. You acknowledge 
                            that beta features are provided "as is" and may contain errors.
                        </p>
                    </section>

                    {/* Section 11 */}
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>11. Privacy</h2>
                        <p className={styles.sectionText}>
                            Our Privacy Policy explains how we collect, use, and protect personal data. By using the Services, you consent to 
                            the processing of your data as described in the Privacy Policy.
                        </p>
                    </section>

                    {/* Section 12 */}
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>12. Termination</h2>
                        
                        <h3 className={styles.subsectionTitle}>12.1 Termination by You</h3>
                        <p className={styles.sectionText}>
                            You may stop using the Services at any time. You may request account deletion by contacting{' '}
                            <a href="mailto:support@thenetwork.life" className={styles.link}>support@thenetwork.life</a> or{' '}
                            <a href="mailto:privacy@thenetwork.life" className={styles.link}>privacy@thenetwork.life</a> (as described in the Privacy Policy).
                        </p>

                        <h3 className={styles.subsectionTitle}>12.2 Termination by Us</h3>
                        <p className={styles.sectionText}>
                            We may suspend or terminate your access if you:
                        </p>
                        <ul className={styles.list}>
                            <li>violate these Terms,</li>
                            <li>misuse the Services,</li>
                            <li>create risk or legal exposure for TheNetwork or others, or</li>
                            <li>if we are required to do so by law.</li>
                        </ul>

                        <h3 className={styles.subsectionTitle}>12.3 Effect of Termination</h3>
                        <p className={styles.sectionText}>
                            Upon termination, your license to use the Services ends. Certain sections of these Terms survive termination, 
                            including intellectual property, disclaimers, limitation of liability, dispute resolution, and indemnification.
                        </p>
                    </section>

                    {/* Section 13 */}
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>13. Disclaimers</h2>
                        <p className={styles.sectionText} style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>
                            THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE." TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE NETWORK 
                            DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
                            PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
                        </p>
                        <p className={styles.sectionText}>We do not guarantee:</p>
                        <ul className={styles.list}>
                            <li>uninterrupted availability,</li>
                            <li>that outputs are error-free,</li>
                            <li>that personalization will match your expectations,</li>
                            <li>that third-party integrations will always function.</li>
                        </ul>
                    </section>

                    {/* Section 14 */}
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>14. Limitation of Liability</h2>
                        <p className={styles.sectionText} style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>
                            TO THE MAXIMUM EXTENT PERMITTED BY LAW:
                        </p>
                        <ul className={styles.list}>
                            <li>
                                <strong>THE NETWORK WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, 
                                OR FOR LOST PROFITS, LOST REVENUE, OR LOST DATA.</strong>
                            </li>
                            <li>
                                <strong>OUR TOTAL LIABILITY FOR ANY CLAIM ARISING OUT OF OR RELATING TO THE SERVICES WILL NOT EXCEED THE 
                                GREATER OF (A) $100 USD OR (B) THE AMOUNT YOU PAID US FOR THE SERVICES IN THE 12 MONTHS BEFORE THE EVENT 
                                GIVING RISE TO LIABILITY.</strong>
                            </li>
                        </ul>
                        <p className={styles.sectionText}>
                            Some jurisdictions do not allow certain limitations, so some of these limits may not apply to you.
                        </p>
                    </section>

                    {/* Section 15 */}
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>15. Indemnification</h2>
                        <p className={styles.sectionText}>
                            You agree to indemnify and hold harmless TheNetwork, its affiliates, officers, employees, and contractors from 
                            and against claims, damages, losses, and expenses (including reasonable attorneys' fees) arising out of:
                        </p>
                        <ul className={styles.list}>
                            <li>your use of the Services,</li>
                            <li>your User Content,</li>
                            <li>your violation of these Terms, or</li>
                            <li>your violation of law or third-party rights.</li>
                        </ul>
                    </section>

                    {/* Section 16 */}
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>16. Dispute Resolution and Arbitration</h2>
                        
                        <h3 className={styles.subsectionTitle}>16.1 Informal Resolution</h3>
                        <p className={styles.sectionText}>
                            Before filing a claim, you agree to contact us at{' '}
                            <a href="mailto:legal@thenetwork.life" className={styles.link}>legal@thenetwork.life</a> and attempt to resolve 
                            the dispute informally.
                        </p>

                        <h3 className={styles.subsectionTitle}>16.2 Binding Arbitration</h3>
                        <p className={styles.sectionText}>
                            Except where prohibited by law, any dispute arising out of or relating to these Terms or the Services will be 
                            resolved by binding arbitration administered by the American Arbitration Association (AAA) under its applicable rules.
                        </p>
                        <ul className={styles.list}>
                            <li>Arbitration will be conducted in English.</li>
                            <li>The arbitration location will be Delaware, USA, unless the parties agree otherwise.</li>
                            <li>The arbitrator may award the same damages and relief that a court could award.</li>
                        </ul>

                        <h3 className={styles.subsectionTitle}>16.3 Jury Trial Waiver</h3>
                        <p className={styles.sectionText} style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>
                            YOU AND THENETWORK EACH WAIVE THE RIGHT TO A JURY TRIAL.
                        </p>

                        <h3 className={styles.subsectionTitle}>16.4 Class Action Waiver</h3>
                        <p className={styles.sectionText} style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>
                            YOU AGREE THAT DISPUTES MUST BE BROUGHT ON AN INDIVIDUAL BASIS ONLY. You may not bring a claim as a plaintiff or 
                            class member in any purported class, collective, or representative proceeding.
                        </p>

                        <h3 className={styles.subsectionTitle}>16.5 Exceptions</h3>
                        <p className={styles.sectionText}>
                            Either party may seek injunctive or equitable relief in court for unauthorized use or infringement of intellectual 
                            property or for security-related claims, to the extent permitted by law.
                        </p>
                    </section>

                    {/* Section 17 */}
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>17. Governing Law</h2>
                        <p className={styles.sectionText}>
                            These Terms are governed by the laws of the State of Delaware, excluding conflict-of-law rules, except where 
                            consumer protection laws in your jurisdiction require otherwise.
                        </p>
                    </section>

                    {/* Section 18 */}
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>18. Changes to These Terms</h2>
                        <p className={styles.sectionText}>
                            We may update these Terms from time to time. If we make material changes, we will notify you by email or in-app 
                            notice. Continued use of the Services after the effective date of updated Terms constitutes acceptance.
                        </p>
                    </section>

                    {/* Section 19 */}
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>19. Miscellaneous</h2>
                        
                        <h3 className={styles.subsectionTitle}>19.1 Severability</h3>
                        <p className={styles.sectionText}>
                            If any provision of these Terms is found unenforceable, the remaining provisions remain in effect.
                        </p>

                        <h3 className={styles.subsectionTitle}>19.2 Assignment</h3>
                        <p className={styles.sectionText}>
                            You may not assign these Terms without our written consent. We may assign these Terms as part of a merger, 
                            acquisition, corporate reorganization, or sale of assets.
                        </p>

                        <h3 className={styles.subsectionTitle}>19.3 Entire Agreement</h3>
                        <p className={styles.sectionText}>
                            These Terms and the Privacy Policy constitute the entire agreement between you and TheNetwork regarding the Services 
                            and supersede prior agreements relating to the Services.
                        </p>
                    </section>

                    {/* Section 20 */}
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>20. Contact Us</h2>
                        <div className={styles.contactInfo}>
                            <p><strong>TheNetwork Labs, Inc.</strong></p>
                            <p>
                                <strong>Email:</strong>{' '}
                                <a href="mailto:legal@thenetwork.life" className={styles.link}>legal@thenetwork.life</a>
                            </p>
                            <p>
                                <strong>Support:</strong>{' '}
                                <a href="mailto:support@thenetwork.life" className={styles.link}>support@thenetwork.life</a>
                            </p>
                            <p>
                                <strong>Website:</strong>{' '}
                                <a href="https://www.thenetwork.life" target="_blank" rel="noopener noreferrer" className={styles.link}>
                                    www.thenetwork.life
                                </a>
                            </p>
                            <p><strong>Address:</strong> New York, NY, USA</p>
                        </div>
                    </section>
                </div>

                {/* Footer */}
                <div className={styles.footer}>
                    <button 
                        className={styles.backButtonBottom}
                        onClick={() => router.back()}
                    >
                        ← Back
                    </button>
                </div>
            </div>
        </div>
    );
}
