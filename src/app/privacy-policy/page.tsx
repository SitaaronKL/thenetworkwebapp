'use client';

import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function PrivacyPolicyPage() {
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
                    <h1 className={styles.title}>Privacy Policy</h1>
                    <p className={styles.lastUpdated}>Last Updated: October 2025</p>
                </div>

                {/* Company Info */}
                <div className={styles.intro}>
                    <p className={styles.companyName}>
                        <strong>Company:</strong> TheNetwork Labs, Inc. ("TheNetwork," "we," "us," or "our")
                    </p>
                    <p className={styles.introText}>
                        This Privacy Policy explains how TheNetwork collects, uses, stores, and protects information when you use 
                        our applications, websites, and related services (collectively, the "Services"). It also describes the 
                        choices and rights you have.
                    </p>
                </div>

                {/* Main Content */}
                <div className={styles.sections}>
                    {/* Section 1 */}
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>1. Scope</h2>
                        <p className={styles.sectionText}>
                            This Privacy Policy applies to information we collect:
                        </p>
                        <ul className={styles.list}>
                            <li>when you create an account or use the Services,</li>
                            <li>when you connect third-party accounts (such as YouTube),</li>
                            <li>when you communicate with us (support, feedback, surveys),</li>
                            <li>when you visit our websites or interact with our emails.</li>
                        </ul>
                        <p className={styles.sectionText}>
                            This Privacy Policy does not cover third-party services (e.g., YouTube/Google) when used outside our 
                            Services. Those services have their own terms and privacy policies.
                        </p>
                    </section>

                    {/* Section 2 */}
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>2. Information We Collect</h2>
                        <p className={styles.sectionText}>
                            We collect information from (A) you, (B) connected platforms you authorize, and (C) your device and 
                            usage of the Services.
                        </p>
                        
                        <h3 className={styles.subsectionTitle}>2.1 Information You Provide</h3>
                        <p className={styles.sectionText}>We may collect:</p>
                        <ul className={styles.list}>
                            <li><strong>Account details:</strong> name, email address, and profile preferences.</li>
                            <li><strong>Authentication details:</strong> information necessary to sign you in (see Section 6).</li>
                            <li><strong>Optional information:</strong> any additional data you choose to provide (e.g., messages, feedback, profile content).</li>
                            <li><strong>Communications:</strong> messages and feedback you send to us.</li>
                        </ul>

                        <h3 className={styles.subsectionTitle}>2.2 Information From Connected Platforms (YouTube / Google)</h3>
                        <p className={styles.sectionText}>
                            If you choose to connect your YouTube account, we access data only through Google's official OAuth and 
                            YouTube Data APIs, and only with the permissions (scopes) you authorize.
                        </p>
                        <p className={styles.sectionText}><strong>Scopes we request (current):</strong></p>
                        <ul className={styles.list}>
                            <li><code className={styles.code}>email</code> (basic email address)</li>
                            <li><code className={styles.code}>profile</code> (basic profile information)</li>
                            <li><code className={styles.code}>https://www.googleapis.com/auth/youtube.readonly</code> (read-only YouTube access)</li>
                        </ul>
                        <p className={styles.sectionText}>
                            With <code className={styles.code}>youtube.readonly</code>, our Services may read:
                        </p>
                        <ul className={styles.list}>
                            <li>Your channel subscriptions list (channels you are subscribed to)</li>
                            <li>Your liked videos list (via the "Liked videos" playlist, when available through the API)</li>
                            <li>Public YouTube data needed to interpret the above (e.g., channel/video metadata such as title, category, and description where returned)</li>
                        </ul>
                        <p className={styles.sectionText}>We do not use <code className={styles.code}>youtube.readonly</code> to:</p>
                        <ul className={styles.list}>
                            <li>upload videos,</li>
                            <li>delete content,</li>
                            <li>modify subscriptions,</li>
                            <li>like/unlike videos,</li>
                            <li>post comments,</li>
                            <li>manage your YouTube account settings.</li>
                        </ul>
                        <p className={styles.sectionText}>
                            We do not request access to your YouTube password, and we do not store your YouTube password.
                        </p>
                        <p className={styles.sectionText}>
                            <strong>Important note about "private playlists":</strong>
                        </p>
                        <p className={styles.sectionText}>
                            We do not request scopes intended for broad private YouTube data access beyond read-only access tied 
                            to your account's subscriptions/likes signals used for personalization. If the API returns information 
                            that includes non-public items for your own account under <code className={styles.code}>youtube.readonly</code>, we treat it as 
                            personal data and protect it under this policy.
                        </p>

                        <h3 className={styles.subsectionTitle}>2.3 Device, Log, and Usage Data</h3>
                        <p className={styles.sectionText}>We may collect:</p>
                        <ul className={styles.list}>
                            <li><strong>Device and technical data:</strong> device type, OS, browser/app version, language.</li>
                            <li><strong>Network data:</strong> IP address and approximate location derived from IP.</li>
                            <li><strong>Usage data:</strong> feature interactions, pages/screens viewed, session duration.</li>
                            <li><strong>Diagnostics:</strong> crash logs, performance metrics, and error reports.</li>
                        </ul>
                        <p className={styles.sectionText}>
                            We use this data for reliability, security, and service improvement.
                        </p>

                        <h3 className={styles.subsectionTitle}>2.4 Cookies and Similar Technologies (Web)</h3>
                        <p className={styles.sectionText}>
                            Our websites may use cookies or similar technologies for login/session management, security, preferences, 
                            and analytics. You can control cookies via browser settings. Some cookies are required for the Services 
                            to function.
                        </p>
                    </section>

                    {/* Section 3 */}
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>3. How We Use Information</h2>
                        <p className={styles.sectionText}>
                            We use information to operate the Services, provide personalization, maintain security, and comply with law.
                        </p>

                        <h3 className={styles.subsectionTitle}>3.1 Core Service Operations</h3>
                        <ul className={styles.list}>
                            <li>Create and manage accounts</li>
                            <li>Authenticate users</li>
                            <li>Provide core app features and settings</li>
                        </ul>

                        <h3 className={styles.subsectionTitle}>3.2 Personalization and "Memory Layer"</h3>
                        <p className={styles.sectionText}>
                            We use your information to deliver personalization features you request, including:
                        </p>
                        <ul className={styles.list}>
                            <li>building and maintaining your private, user-controlled "TheNetwork Memory Layer"</li>
                            <li>generating interest analysis from connected signals (e.g., YouTube subscriptions/liked videos) to tailor your experience</li>
                        </ul>

                        <h3 className={styles.subsectionTitle}>3.3 Service Improvement, Analytics, and Debugging</h3>
                        <ul className={styles.list}>
                            <li>Improve performance and reliability</li>
                            <li>Fix bugs and troubleshoot crashes</li>
                            <li>Evaluate feature usage to improve product quality</li>
                        </ul>

                        <h3 className={styles.subsectionTitle}>3.4 Communications</h3>
                        <ul className={styles.list}>
                            <li>Send security and operational messages (e.g., login verification, account notices)</li>
                            <li>Send product updates or invitations when permitted by your preferences and applicable law</li>
                        </ul>

                        <h3 className={styles.subsectionTitle}>3.5 Security, Fraud Prevention, and Legal Compliance</h3>
                        <ul className={styles.list}>
                            <li>Detect and prevent abuse, fraud, and unauthorized access</li>
                            <li>Enforce our terms and protect users</li>
                            <li>Comply with legal obligations and valid legal requests</li>
                        </ul>

                        <p className={styles.sectionText}>
                            <strong>No advertising by default:</strong> Your data is not used for third-party targeted advertising, 
                            and we do not sell your personal data.
                        </p>
                    </section>

                    {/* Section 4 */}
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>4. Google / YouTube API Data: Limited Use and Sharing Restrictions</h2>
                        
                        <h3 className={styles.subsectionTitle}>4.1 Google API Limited Use Disclosure</h3>
                        <p className={styles.sectionText}>
                            TheNetwork's use and transfer of information received from Google APIs will adhere to the Google API 
                            Services User Data Policy, including the Limited Use requirements.
                        </p>

                        <h3 className={styles.subsectionTitle}>4.2 How we use Google/YouTube user data</h3>
                        <p className={styles.sectionText}>
                            Information obtained from YouTube (including subscriptions and liked videos signals) is used only to:
                        </p>
                        <ul className={styles.list}>
                            <li>provide and improve user-facing features inside TheNetwork (e.g., personalization and interest analysis you request)</li>
                            <li>maintain account connections you initiate</li>
                            <li>secure the Services and prevent abuse</li>
                        </ul>
                        <p className={styles.sectionText}>We do not use Google/YouTube user data for:</p>
                        <ul className={styles.list}>
                            <li>selling data</li>
                            <li>advertising targeting</li>
                            <li>building profiles for third-party advertising</li>
                            <li>transferring the data to third parties for their independent use</li>
                        </ul>

                        <h3 className={styles.subsectionTitle}>4.3 When we share data</h3>
                        <p className={styles.sectionText}>We may share limited information only:</p>
                        <ul className={styles.list}>
                            <li>with service providers that help us run the Services (e.g., hosting, database, security, analytics) under contractual confidentiality and security obligations, and only as necessary to provide the Services</li>
                            <li>when required by law or to protect rights and safety (see Section 8)</li>
                        </ul>
                        <p className={styles.sectionText}>
                            We do not share Google/YouTube user data with data brokers or advertisers.
                        </p>

                        <h3 className={styles.subsectionTitle}>4.4 Human access to connected-platform data</h3>
                        <p className={styles.sectionText}>Access to connected-platform data is restricted:</p>
                        <ul className={styles.list}>
                            <li>By default, our systems process connected data automatically to provide features.</li>
                            <li>Authorized personnel may access limited data only when necessary for support, debugging, security investigations, or compliance, and under confidentiality obligations.</li>
                        </ul>
                    </section>

                    {/* Section 5 */}
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>5. Data Ownership and Control</h2>
                        <p className={styles.sectionText}>
                            <strong>You own your data.</strong>
                        </p>
                        <p className={styles.sectionText}>
                            Depending on product features available in your account, you can:
                        </p>
                        <ul className={styles.list}>
                            <li>view, edit, export, or delete your data</li>
                            <li>disconnect connected platforms (like YouTube) at any time</li>
                            <li>request deletion of your account and associated data (see Section 7)</li>
                        </ul>
                    </section>

                    {/* Section 6 */}
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>6. Authentication (Google Sign-In)</h2>
                        <p className={styles.sectionText}>
                            If you sign in using Google, we receive basic profile information from Google (such as email and profile) 
                            necessary to authenticate you and maintain your account. The exact information depends on the permissions 
                            you grant.
                        </p>
                    </section>

                    {/* Section 7 */}
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>7. Revoking YouTube Access, Deleting Data, and Data Retention</h2>
                        
                        <h3 className={styles.subsectionTitle}>7.1 Revoking access</h3>
                        <p className={styles.sectionText}>
                            You can revoke TheNetwork's access to YouTube at any time:
                        </p>
                        <ul className={styles.list}>
                            <li>in your TheNetwork account settings (Connected Accounts / Integrations), and/or</li>
                            <li>in your Google Account security permissions (Third-party access)</li>
                        </ul>
                        <p className={styles.sectionText}><strong>After revocation:</strong></p>
                        <ul className={styles.list}>
                            <li>We stop fetching new data from YouTube.</li>
                            <li>Existing stored data (if any) remains until you delete it or request account deletion, unless we must retain limited records for security or legal compliance.</li>
                        </ul>

                        <h3 className={styles.subsectionTitle}>7.2 Data deletion requests</h3>
                        <p className={styles.sectionText}>
                            You can request deletion of your account and associated personal data at any time by contacting{' '}
                            <a href="mailto:privacy@thenetwork.life" className={styles.link}>privacy@thenetwork.life</a>.
                        </p>
                        <p className={styles.sectionText}>
                            We may retain limited information where required by law or for legitimate security purposes (e.g., 
                            fraud prevention logs) and will protect it under this policy.
                        </p>

                        <h3 className={styles.subsectionTitle}>7.3 Retention</h3>
                        <p className={styles.sectionText}>
                            We retain personal data only as long as needed to:
                        </p>
                        <ul className={styles.list}>
                            <li>provide the Services,</li>
                            <li>maintain security and prevent abuse,</li>
                            <li>comply with legal obligations.</li>
                        </ul>
                        <p className={styles.sectionText}>
                            Retention periods may vary by data type. You may request deletion at any time.
                        </p>
                    </section>

                    {/* Section 8 */}
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>8. Security</h2>
                        <p className={styles.sectionText}>
                            We use reasonable administrative, technical, and organizational safeguards designed to protect your information.
                        </p>
                        <p className={styles.sectionText}>
                            Safeguards may include encryption in transit (e.g., TLS) and access controls limiting internal access 
                            to authorized personnel.
                        </p>
                        <p className={styles.sectionText}>
                            No system is perfectly secure. We work to protect your information, but we cannot guarantee absolute security.
                        </p>
                        <p className={styles.sectionText}>
                            If a data breach occurs, we will notify affected users as required by applicable law.
                        </p>
                    </section>

                    {/* Section 9 */}
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>9. Third-Party Integrations</h2>
                        <p className={styles.sectionText}>
                            Our integrations with YouTube and other platforms comply with applicable API terms and policies. You can 
                            revoke connections at any time. We do not collect or store passwords for third-party platforms.
                        </p>
                    </section>

                    {/* Section 10 */}
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>10. International Data Transfers</h2>
                        <p className={styles.sectionText}>
                            If you access the Services from outside the United States, your data may be transferred and processed in 
                            the U.S. or other jurisdictions. Where required, we use appropriate safeguards to protect transferred data.
                        </p>
                    </section>

                    {/* Section 11 */}
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>11. Children's Privacy</h2>
                        <p className={styles.sectionText}>
                            TheNetwork does not knowingly collect personal data from children under 13 (or under 16 in the EEA/UK).
                        </p>
                        <p className={styles.sectionText}>
                            If we learn we have inadvertently collected such data, we will delete it.
                        </p>
                    </section>

                    {/* Section 12 */}
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>12. Your Rights</h2>
                        <p className={styles.sectionText}>
                            Depending on your location, you may have rights to:
                        </p>
                        <ul className={styles.list}>
                            <li>access, correct, or delete your data</li>
                            <li>export your data</li>
                            <li>object to or restrict certain processing</li>
                            <li>withdraw consent where processing is based on consent</li>
                        </ul>
                        <p className={styles.sectionText}>
                            To exercise these rights, contact{' '}
                            <a href="mailto:privacy@thenetwork.life" className={styles.link}>privacy@thenetwork.life</a>.
                        </p>
                    </section>

                    {/* Section 13 */}
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>13. Changes to This Policy</h2>
                        <p className={styles.sectionText}>
                            We may update this Privacy Policy to reflect product or legal changes. When we do, we will update the 
                            "Last Updated" date and may notify users via email or in-app notice where appropriate.
                        </p>
                    </section>

                    {/* Section 14 */}
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>14. Contact Us</h2>
                        <div className={styles.contactInfo}>
                            <p><strong>TheNetwork Labs, Inc.</strong></p>
                            <p>
                                <strong>Email:</strong>{' '}
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
