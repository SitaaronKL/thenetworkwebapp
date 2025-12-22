'use client';

import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function TermsOfUsePage() {
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
                    <h1 className={styles.title}>Terms of Use</h1>
                    <p className={styles.lastUpdated}>Last Updated: October 2025</p>
                </div>

                {/* Company Info */}
                <div className={styles.intro}>
                    <p className={styles.companyName}>
                        <strong>Company:</strong> TheNetwork Labs, Inc. ("TheNetwork," "we," "us," or "our")
                    </p>
                    <p className={styles.introText}>
                        <strong>Services:</strong> TheNetwork's websites, apps (including Asteri), and related services, features, and tools (collectively, the "Services").
                    </p>
                    <p className={styles.introText}>
                        By accessing or using the Services, you agree to these Terms of Use ("Terms") and acknowledge our Privacy Policy. 
                        If you do not agree, do not use the Services.
                    </p>
                </div>

                {/* Main Content */}
                <div className={styles.sections}>
                    {/* Section 1 */}
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>1. Eligibility</h2>
                        <p className={styles.sectionText}>
                            You must be at least 13 years old to use the Services (or 16 if you are located in the EEA/UK, or older if 
                            required by local law). By using the Services, you represent that you meet these requirements and have the 
                            legal capacity to accept these Terms.
                        </p>
                        <p className={styles.sectionText}>
                            If you are using the Services on behalf of an organization, you represent that you are authorized to accept 
                            these Terms on that organization's behalf.
                        </p>
                    </section>

                    {/* Section 2 */}
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>2. Relationship to Other Policies</h2>
                        <p className={styles.sectionText}>
                            These Terms incorporate by reference:
                        </p>
                        <ul className={styles.list}>
                            <li>our Privacy Policy (how we collect/use/protect data), and</li>
                            <li>any additional terms presented within specific features (for example, beta features, paid features, or community tools).</li>
                        </ul>
                        <p className={styles.sectionText}>
                            If there is a conflict, the feature-specific terms control for that feature.
                        </p>
                    </section>

                    {/* Section 3 */}
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>3. Account Registration and Security</h2>
                        
                        <h3 className={styles.subsectionTitle}>3.1 Creating an Account</h3>
                        <p className={styles.sectionText}>
                            Some features require an account. You agree to provide accurate information and keep it updated.
                        </p>

                        <h3 className={styles.subsectionTitle}>3.2 Account Security</h3>
                        <p className={styles.sectionText}>
                            You are responsible for maintaining the confidentiality of your login credentials and for all activities under 
                            your account. If you believe your account has been compromised, contact{' '}
                            <a href="mailto:support@thenetwork.life" className={styles.link}>support@thenetwork.life</a> promptly.
                        </p>

                        <h3 className={styles.subsectionTitle}>3.3 Account Suspension for Safety</h3>
                        <p className={styles.sectionText}>
                            We may suspend or restrict access to protect you, other users, and the Services (for example, suspected fraud, 
                            abuse, or security risks).
                        </p>
                    </section>

                    {/* Section 4 */}
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>4. How You May Use the Services</h2>
                        <p className={styles.sectionText}>
                            Subject to these Terms, TheNetwork grants you a limited, non-exclusive, non-transferable, revocable right to 
                            use the Services for personal, non-commercial use unless we explicitly agree otherwise.
                        </p>
                        <p className={styles.sectionText}>
                            You agree to use the Services only in compliance with applicable law and these Terms.
                        </p>
                    </section>

                    {/* Section 5 */}
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>5. Acceptable Use (What You Agree Not to Do)</h2>
                        <p className={styles.sectionText}>You agree not to:</p>
                        <ul className={styles.list}>
                            <li>use the Services for unlawful, harmful, or abusive purposes;</li>
                            <li>harass, threaten, defame, or exploit others;</li>
                            <li>attempt to gain unauthorized access to accounts, private data, systems, or networks;</li>
                            <li>interfere with security features, rate limits, or access controls;</li>
                            <li>reverse engineer, decompile, or attempt to extract source code or underlying components (except where prohibited by law);</li>
                            <li>scrape or automate access in a way that overwhelms, bypasses, or undermines the Services (unless expressly permitted);</li>
                            <li>upload, transmit, or distribute malware, harmful code, or content designed to disrupt systems;</li>
                            <li>submit content that infringes intellectual property, privacy, or other rights of any person;</li>
                            <li>use the Services to collect or store personal data about others without authorization.</li>
                        </ul>
                        <p className={styles.sectionText}>
                            We may remove content or restrict access if we believe a violation has occurred.
                        </p>
                    </section>

                    {/* Section 6 */}
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>6. Connected Accounts and Third-Party Services (YouTube and Others)</h2>
                        
                        <h3 className={styles.subsectionTitle}>6.1 Third-Party Connections</h3>
                        <p className={styles.sectionText}>
                            The Services may let you connect third-party accounts (such as YouTube, TikTok, or Pinterest). If you connect 
                            a third-party service, you authorize TheNetwork to access and process data from that service only as permitted by:
                        </p>
                        <ul className={styles.list}>
                            <li>the permissions (scopes) you grant, and</li>
                            <li>our Privacy Policy.</li>
                        </ul>
                        <p className={styles.sectionText}>
                            We do not collect or store your third-party platform passwords.
                        </p>

                        <h3 className={styles.subsectionTitle}>6.2 YouTube Terms</h3>
                        <p className={styles.sectionText}>
                            If you use features that access YouTube data, you also agree to comply with YouTube's Terms of Service:{' '}
                            <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer" className={styles.link}>
                                https://www.youtube.com/t/terms
                            </a>
                        </p>
                        <p className={styles.sectionText}>
                            YouTube is a third-party service not controlled by TheNetwork, and your use of YouTube remains subject to 
                            YouTube's policies and terms.
                        </p>

                        <h3 className={styles.subsectionTitle}>6.3 Revoking Access</h3>
                        <p className={styles.sectionText}>
                            You can revoke access to any connected third-party account at any time via:
                        </p>
                        <ul className={styles.list}>
                            <li>your TheNetwork settings (where available), and/or</li>
                            <li>the third-party provider's account permissions/security settings.</li>
                        </ul>
                        <p className={styles.sectionText}>
                            After revocation, we stop fetching new data from that provider, subject to our Privacy Policy (including 
                            retention and deletion options).
                        </p>
                    </section>

                    {/* Section 7 */}
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>7. User Content</h2>
                        <p className={styles.sectionText}>
                            "User Content" means text, images, messages, files, links, and other content you submit, upload, or share 
                            through the Services.
                        </p>

                        <h3 className={styles.subsectionTitle}>7.1 Ownership</h3>
                        <p className={styles.sectionText}>
                            You retain ownership of your User Content as between you and TheNetwork.
                        </p>

                        <h3 className={styles.subsectionTitle}>7.2 Permission to Operate the Services</h3>
                        <p className={styles.sectionText}>
                            You grant TheNetwork a worldwide, non-exclusive, royalty-free license to host, store, reproduce, process, 
                            display, and transmit your User Content only as necessary to provide, operate, maintain, and improve the 
                            Services, including personalization and memory features you choose to use.
                        </p>
                        <p className={styles.sectionText}>
                            This license ends when you delete your User Content, except to the extent we must retain certain information 
                            for legal compliance, safety/security, dispute resolution, or enforcement, as described in our Privacy Policy.
                        </p>

                        <h3 className={styles.subsectionTitle}>7.3 Your Responsibilities</h3>
                        <p className={styles.sectionText}>
                            You represent and warrant that you have the rights to submit your User Content and that it does not violate 
                            law or third-party rights.
                        </p>
                    </section>

                    {/* Section 8 */}
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>8. Personalization and Automated Processing</h2>
                        <p className={styles.sectionText}>
                            Some features may use automated processing to help organize or personalize your experience (for example, 
                            categorizing interests or generating personalized recommendations based on signals you provide or connect). 
                            We describe our data use and controls in the Privacy Policy.
                        </p>
                    </section>

                    {/* Section 9 */}
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>9. Intellectual Property</h2>
                        <p className={styles.sectionText}>
                            The Services (including software, designs, logos, trademarks, and underlying technology) are owned by 
                            TheNetwork or its licensors and are protected by applicable laws.
                        </p>
                        <p className={styles.sectionText}>
                            You may not copy, modify, distribute, sell, lease, or create derivative works from the Services unless you 
                            have our prior written permission.
                        </p>
                        <p className={styles.sectionText}>
                            If you provide feedback or suggestions, you grant TheNetwork the right to use them without restriction or 
                            compensation.
                        </p>
                    </section>

                    {/* Section 10 */}
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>10. Service Availability, Changes, and Beta Features</h2>
                        <p className={styles.sectionText}>
                            The Services may change over time. We may add, modify, suspend, or discontinue any part of the Services at any time.
                        </p>
                        <p className={styles.sectionText}>
                            Some features may be labeled beta or experimental and may be unstable, change without notice, or be removed. 
                            Beta features are provided "as is."
                        </p>
                    </section>

                    {/* Section 11 */}
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>11. Termination</h2>
                        
                        <h3 className={styles.subsectionTitle}>11.1 You May Stop Using the Services</h3>
                        <p className={styles.sectionText}>
                            You may stop using the Services at any time. You may request account deletion as described in the Privacy Policy.
                        </p>

                        <h3 className={styles.subsectionTitle}>11.2 We May Suspend or Terminate Access</h3>
                        <p className={styles.sectionText}>
                            We may suspend or terminate your access if you violate these Terms, misuse the Services, or if we must do so 
                            to comply with law or protect the Services and users.
                        </p>
                    </section>

                    {/* Section 12 */}
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>12. Disclaimers</h2>
                        <p className={styles.sectionText} style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>
                            THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE." TO THE MAXIMUM EXTENT PERMITTED BY LAW, THENETWORK 
                            DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR 
                            PURPOSE, AND NON-INFRINGEMENT.
                        </p>
                        <p className={styles.sectionText}>
                            We do not guarantee uninterrupted access, error-free operation, or that third-party integrations will always function.
                        </p>
                    </section>

                    {/* Section 13 */}
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>13. Limitation of Liability</h2>
                        <p className={styles.sectionText} style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>
                            TO THE MAXIMUM EXTENT PERMITTED BY LAW:
                        </p>
                        <ul className={styles.list}>
                            <li>
                                <strong>THENETWORK WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, 
                                OR FOR LOST PROFITS, REVENUE, OR DATA.</strong>
                            </li>
                            <li>
                                <strong>THENETWORK'S TOTAL LIABILITY FOR ANY CLAIM ARISING OUT OF OR RELATING TO THE SERVICES WILL NOT EXCEED 
                                THE GREATER OF (A) $100 USD OR (B) THE AMOUNT YOU PAID US FOR THE SERVICES IN THE 12 MONTHS BEFORE THE EVENT 
                                GIVING RISE TO LIABILITY.</strong>
                            </li>
                        </ul>
                        <p className={styles.sectionText}>
                            Some jurisdictions do not allow certain limitations, so these limits may not apply to you.
                        </p>
                    </section>

                    {/* Section 14 */}
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>14. Indemnification</h2>
                        <p className={styles.sectionText}>
                            You agree to indemnify and hold harmless TheNetwork, its affiliates, officers, employees, and contractors from 
                            any claims, damages, losses, and expenses (including reasonable attorneys' fees) arising out of:
                        </p>
                        <ul className={styles.list}>
                            <li>your use of the Services,</li>
                            <li>your User Content, or</li>
                            <li>your violation of these Terms or applicable law.</li>
                        </ul>
                    </section>

                    {/* Section 15 */}
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>15. Dispute Resolution</h2>
                        
                        <h3 className={styles.subsectionTitle}>15.1 Informal Resolution</h3>
                        <p className={styles.sectionText}>
                            Before filing a legal claim, you agree to contact us at{' '}
                            <a href="mailto:legal@thenetwork.life" className={styles.link}>legal@thenetwork.life</a> and attempt to resolve 
                            the dispute informally.
                        </p>

                        <h3 className={styles.subsectionTitle}>15.2 Arbitration (If Permitted By Law)</h3>
                        <p className={styles.sectionText}>
                            Except where prohibited by applicable law, disputes arising out of or relating to these Terms or the Services 
                            will be resolved through binding arbitration administered by the American Arbitration Association (AAA) under its 
                            applicable rules.
                        </p>
                        <ul className={styles.list}>
                            <li>Arbitration will be conducted in English.</li>
                            <li>Venue: Delaware, USA (unless required otherwise by applicable consumer law).</li>
                            <li>The arbitrator's decision will be final and enforceable in a court of competent jurisdiction.</li>
                        </ul>

                        <h3 className={styles.subsectionTitle}>15.3 Jury Trial and Class Action Waiver</h3>
                        <p className={styles.sectionText} style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>
                            YOU AND THENETWORK WAIVE ANY RIGHT TO A JURY TRIAL.
                        </p>
                        <p className={styles.sectionText} style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>
                            DISPUTES MUST BE BROUGHT ON AN INDIVIDUAL BASIS. You may not participate in a class, collective, or representative proceeding.
                        </p>
                    </section>

                    {/* Section 16 */}
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>16. Governing Law</h2>
                        <p className={styles.sectionText}>
                            These Terms are governed by the laws of the State of Delaware, without regard to conflict-of-law principles, 
                            except where local consumer protection laws require otherwise.
                        </p>
                    </section>

                    {/* Section 17 */}
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>17. Changes to These Terms</h2>
                        <p className={styles.sectionText}>
                            We may update these Terms from time to time. If we make material changes, we may notify you via email or in-app 
                            notice. Continued use of the Services after the updated Terms become effective constitutes acceptance.
                        </p>
                    </section>

                    {/* Section 18 */}
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>18. Contact</h2>
                        <div className={styles.contactInfo}>
                            <p><strong>TheNetwork Labs, Inc.</strong></p>
                            <p>
                                <strong>Legal:</strong>{' '}
                                <a href="mailto:legal@thenetwork.life" className={styles.link}>legal@thenetwork.life</a>
                            </p>
                            <p>
                                <strong>Support:</strong>{' '}
                                <a href="mailto:support@thenetwork.life" className={styles.link}>support@thenetwork.life</a>
                            </p>
                            <p>
                                <strong>Privacy:</strong>{' '}
                                <a href="mailto:privacy@thenetwork.life" className={styles.link}>privacy@thenetwork.life</a>
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

