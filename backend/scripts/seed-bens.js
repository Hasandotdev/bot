const prisma = require('../services/db');

const CLIENT_ID = 'cmt11f9x900186d93tc2uz7wl';

const knowledge = [
  {
    label: 'About Bens Advisory',
    topic: 'about',
    content:
      'Bens Advisory LTD is a London-based accounting, tax and business advisory firm founded in the UAE in 2016 and expanded to the UK in 2021. With 20+ years of combined experience, HMRC Registered, AIA Certified, ICO Registered and AML Certified. They partner with 100+ businesses globally, offering a partnership approach rather than a traditional client-accountant relationship. Head of Operations: Mr. Mek (FCMA, AAIA, FCPA, CA, 25+ years). Tax & Compliance Head: Mr. NJK (ACPA, CA, 20+ years). Client Execution Manager: Mr. ZA (AICPA, CA, 15+ years).',
  },
  {
    label: 'Company Mission & Vision',
    topic: 'about',
    content:
      'Mission: To partner with businesses and create value for money by providing comprehensive business solutions, saving time and resources for entrepreneurs. Vision: To be the leading professional consultancy offering 360-degree services from accounting and tax to audit and CFO services, striving for smart, lean business operations.',
  },
  {
    label: 'Core Values',
    topic: 'about',
    content:
      'Partnership - mutual partnering with clients creating value for money. Quality with Affordability - key solutions at an affordable fee to fuel client growth. Confidentiality - high ethical standards and confidentiality; trust is foundational. Innovation - leveraging technology for cost-effective solutions. Mutuality - shared benefits where all parties gain.',
  },
  {
    label: 'Company Timeline & Milestones',
    topic: 'about',
    content:
      '2016: Founded in the UAE. 2019: Regional expansion. 2021: Bens Advisory LTD established in the UK. 2022: Pakistan back office established. 2025: Ireland expansion. 2026: Digitalization and European expansion. Global offices in UK, UAE, Pakistan and Ireland.',
  },
  {
    label: 'Contact Information',
    topic: 'contact',
    content:
      'Phone: +44 7763 711 744. Email: info@bensadvisory.co.uk. Address: 20 North Street, 2nd Floor, Romford, RM1 1BH, London, UK. Response time typically under 2 hours during business hours. Global offices also in UAE (bensauditors.com) and Pakistan (bensadvisorypk.com) and Ireland.',
  },
  {
    label: 'Why Choose Bens Advisory',
    topic: 'general',
    content:
      '90% client satisfaction, thousands in tax saved, 24/7 support available. Partnership not service - they become part of your team. Immediate response, full HMRC and Companies House compliance, 20+ years experience, proactive advisory identifying opportunities and risks, dedicated team of qualified professionals.',
  },
  {
    label: 'How We Work - 3 Steps',
    topic: 'process',
    content:
      '1. Free Consultation: an engaging in-person or virtual session to understand your business, identify key issues, assess gaps and propose tailored solutions. 2. Onboarding: gather financial data, set up systems and create a roadmap for success. 3. Partnership Begins: Bens walks with you every step of the way, not just a typical service provider.',
  },
  {
    label: 'Client Testimonials',
    topic: 'general',
    content:
      'Sarah Mitchell, CEO TechStart Ltd: "Bens Advisory transformed how we manage our finances. Their proactive approach helped us identify tax savings we never knew existed." Michael Thompson, MD Construction Plus: "Their CIS expertise is unmatched. They handle all our subcontractor compliance seamlessly." Priya Sharma, Founder Bloom Restaurants: "As a hospitality business owner, compliance is crucial. Bens Advisory ensures we are always ahead of regulations while providing strategic advice for growth."',
  },
  {
    label: 'Accounting & Bookkeeping Overview',
    topic: 'services',
    content:
      'Comprehensive accounting and bookkeeping services providing real-time visibility into finances. Handles daily transaction recording to comprehensive financial reporting. Services include Daily Bookkeeping (transaction recording, bank reconciliations, invoice processing), Management Accounts (monthly reports with insights), Cash Flow Management (monitoring and forecasting), Year-End Accounts (statutory accounts and audit support), Compliance & Reporting (Companies House filings), Cloud Accounting Setup (Xero, QuickBooks, Sage, Zoho Books, FreeAgent, Wave). Benefits: reduced overhead vs in-house staff, expert insights without full-time hire, scalable solutions. Process: Assessment, Setup, Transition, Ongoing Support.',
  },
  {
    label: 'Tax Advisory Overview',
    topic: 'services',
    content:
      'Proactive tax planning throughout the year to identify savings and reliefs. Services: Corporate Tax Planning (minimize company tax liability legally), Personal Tax Returns (Self-Assessment for individuals and directors), International Taxation (cross-border planning), R&D Tax Credits (identify and claim R&D reliefs), Tax Compliance (full HMRC compliance), HMRC Investigations (support and representation during tax enquiries). Handles Corporation Tax, Income Tax, Capital Gains Tax, Inheritance Tax, VAT, PAYE. R&D tax credits for technology/software development, manufacturing process improvements, product innovation, scientific research.',
  },
  {
    label: 'VAT Services Overview',
    topic: 'services',
    content:
      'VAT registration, returns and advisory. Services: VAT Registration (registration thresholds and voluntary registration benefits), VAT Returns (quarterly/monthly preparation and submission), Cross-Border VAT (imports, exports, international VAT rules), MTD Compliance (Making Tax Digital setup and support), VAT Scheme Advice (Flat Rate, Cash Accounting, Annual Accounting, Retail, Margin schemes), VAT Health Checks. All VAT-registered businesses must comply with Making Tax Digital - keeping digital records and submitting returns through compatible software. Helps choose the right VAT scheme, prepare accurate returns, navigate cross-border transactions while maximizing cash flow.',
  },
  {
    label: 'Payroll, PAYE & CIS Overview',
    topic: 'services',
    content:
      'Payroll management for businesses from 5 to 500 employees. Services: Payroll Processing (weekly, fortnightly, monthly runs with full HMRC RTI compliance), PAYE Management (tax code management and NI calculations), CIS Returns (Construction Industry Scheme compliance for contractors and subcontractors), Pension Auto-Enrolment, Year-End Processing (P60s, P11Ds, P45s), Compliance & Reporting (RTI submissions). Software: Sage Payroll, Xero Payroll, QuickBooks Payroll, BrightPay, Moneysoft, IRIS. CIS: contractor and subcontractor registration, verification with HMRC, monthly CIS returns and deductions, year-end CIS reconciliation. Process: Data Collection, Processing, Review & Approval, Payment & Reporting.',
  },
  {
    label: 'CFO & Director Services Overview',
    topic: 'services',
    content:
      'Fractional CFO services giving access to senior financial expertise without the full-time cost (a full-time CFO often costs 150,000 GBP+ per year). Services: Financial Strategy, Board-Level Reporting, Investor Relations (fundraising, investor presentations, due diligence), KPI Development, M&A Advisory, Risk Management. Flexible engagement models: Part-time CFO, Interim CFO, Project-based CFO, Virtual CFO, Advisory CFO, Startup CFO. Ideal for raising investment/debt finance, preparing for sale/exit, scaling rapidly, implementing new systems, or navigating complex financial decisions. Funding raised 50M+ GBP.',
  },
  {
    label: 'Business Advisory Overview',
    topic: 'services',
    content:
      'Strategic guidance from company formation to exit planning. Services: Company Formation (structuring your business), Business Planning (business plans and financial forecasting), M&A Support (due diligence, valuations, transaction support), Exit Strategy, Corporate Governance, Strategic Planning. Areas of expertise: Startup Advisory, Growth Strategy, Turnaround, Exit Planning, Due Diligence, Restructuring. M&A support includes business valuations and pricing, due diligence coordination, deal structuring and negotiation, post-acquisition integration, tax-efficient transaction planning.',
  },
  {
    label: 'Website Development & SEO Overview',
    topic: 'services',
    content:
      'Custom website design and SEO optimisation. Services: Custom Website Design, Responsive Development (mobile-first), E-Commerce Solutions (secure payment integration), SEO Optimisation, Performance Optimisation, Website Maintenance (updates and security monitoring). Technologies: WordPress, Shopify, WooCommerce, React, Next.js, Custom CMS. SEO: keyword research and strategy, on-page optimisation, technical SEO audit, local SEO for UK businesses, monthly performance reports. Process: Discovery, Design, Development, Launch & Support.',
  },
  {
    label: 'Social Media Management Overview',
    topic: 'services',
    content:
      'Strategic social media management. Services: Social Media Strategy, Content Creation (posts, graphics, videos), Community Management, Paid Advertising (Facebook, Instagram, LinkedIn), Analytics & Reporting, Content Calendar. Platforms: Facebook, Instagram, LinkedIn, Twitter/X, TikTok, YouTube. Benefits: increased brand awareness, higher engagement, lead generation, stronger customer relationships, competitive advantage, consistent brand messaging. Process: Discovery, Strategy, Execution, Optimise.',
  },
  {
    label: 'Graphic Design & Branding Overview',
    topic: 'services',
    content:
      'Graphic design and branding solutions. Services: Logo Design, Brand Identity (comprehensive visual identity systems), Marketing Materials (brochures, flyers, print), Brand Guidelines, Social Media Graphics, Digital Design (presentations, digital ads, web graphics). Design packages: Startup Package, Brand Refresh, Rebranding, Marketing Kit, Social Media, Custom Project. Brand package includes primary and secondary logo variations, color palette and typography, business card and letterhead, social media profile assets, brand guidelines document, all source files. Process: Discovery, Concept, Refine, Deliver. 48h quick turnaround.',
  },
];

const services = [
  {
    name: 'Accounting & Bookkeeping',
    description:
      'Comprehensive accounting and bookkeeping services including daily transaction recording, bank reconciliations, management accounts, cash flow management, year-end statutory accounts and cloud accounting setup on Xero, QuickBooks, Sage and Zoho Books. We give you real-time visibility into your finances without the overhead of in-house staff.',
    qualifyingQuestions: [
      'What size is your business and how many transactions do you process per month?',
      'Are you a startup needing to establish accounting processes, or an established business looking to outsource your finance function?',
      'Which accounting software do you currently use, if any?',
      'Do you need management accounts or cash flow forecasting on a monthly basis?',
      'Are your year-end accounts and Companies House filings currently up to date?',
    ],
    engagementQuestions: [
      'Would you like a free consultation to review your current financial setup and see where we can add value?',
    ],
    features: [
      'Daily bookkeeping, bank reconciliations and invoice processing',
      'Monthly management accounts with insights and analysis',
      'Cash flow monitoring and forecasting',
      'Year-end statutory accounts and audit support',
      'Companies House filing and regulatory compliance',
      'Cloud accounting setup on Xero, QuickBooks, Sage and Zoho Books',
    ],
  },
  {
    name: 'Tax Advisory',
    description:
      'Strategic tax planning to legally minimize your tax burden while maintaining full HMRC compliance. We cover corporate tax planning, personal tax returns, international taxation, R&D tax credits, and expert representation during HMRC investigations.',
    qualifyingQuestions: [
      'Are you an individual, a limited company, or both?',
      'Do you have complex tax needs such as international operations, property, or capital gains?',
      'Are you claiming R&D tax credits or would you like to check your eligibility?',
      'Have you received any correspondence from HMRC or are you under investigation?',
      'When is your Self-Assessment or corporation tax deadline?',
    ],
    engagementQuestions: [
      'Did you know UK businesses often miss out on R&D tax credits worth significant relief? Would you like us to review your eligibility?',
    ],
    features: [
      'Corporate and personal tax planning to minimize liability legally',
      'Self-Assessment preparation and submission',
      'International and cross-border tax planning',
      'R&D tax credit identification and claims',
      'Full HMRC compliance and deadline management',
      'Expert support during HMRC investigations',
    ],
  },
  {
    name: 'VAT Services',
    description:
      'Complete VAT registration, return preparation and advisory services. We help you choose the right VAT scheme, ensure Making Tax Digital compliance, handle cross-border VAT and optimize your cash flow while avoiding penalties.',
    qualifyingQuestions: [
      'Is your business registered for VAT or approaching the registration threshold?',
      'Do you trade internationally with imports or exports?',
      'Are you compliant with Making Tax Digital for VAT?',
      'Which VAT scheme are you on currently, if any?',
      'Do you need help with VAT returns or a VAT health check?',
    ],
    engagementQuestions: [
      'Are you aware of the VAT schemes that could improve your cash flow, such as Flat Rate or Cash Accounting?',
    ],
    features: [
      'VAT registration guidance including voluntary registration benefits',
      'Accurate quarterly and monthly VAT return preparation',
      'Cross-border VAT advice for imports and exports',
      'Making Tax Digital setup and ongoing compliance',
      'VAT scheme optimisation (Flat Rate, Cash Accounting, Annual, Retail, Margin)',
      'Comprehensive VAT health checks',
    ],
  },
  {
    name: 'Payroll, PAYE & CIS',
    description:
      'Efficient payroll management including PAYE, National Insurance, pension auto-enrolment and Construction Industry Scheme (CIS) compliance. We handle payroll for businesses from 5 to 500 employees, ensuring accurate, on-time payments with full HMRC RTI compliance.',
    qualifyingQuestions: [
      'How many employees do you have and how often are they paid?',
      'Do you work in the construction industry and need CIS compliance?',
      'Do you manage workplace pensions with auto-enrolment?',
      'Are you currently handling payroll in-house or outsourcing it?',
      'Which payroll software do you use, if any?',
    ],
    engagementQuestions: [
      'Would you like us to review your current payroll setup to ensure full HMRC RTI compliance?',
    ],
    features: [
      'Weekly, fortnightly and monthly payroll runs with RTI compliance',
      'Full PAYE administration including tax codes and NI calculations',
      'Construction Industry Scheme (CIS) registration, returns and reconciliations',
      'Pension auto-enrolment management',
      'Year-end processing: P60s, P11Ds and P45s',
      'Dedicated payroll specialist and scalable solutions',
    ],
  },
  {
    name: 'CFO & Director Services',
    description:
      'Fractional CFO and finance director services giving you senior executive expertise without the full-time cost. Available as part-time, interim, project-based, virtual or advisory CFO, covering financial strategy, board reporting, investor relations, KPI development, M&A and risk management.',
    qualifyingQuestions: [
      'Are you raising investment or debt finance and need financial reporting support?',
      'Are you planning a sale or exit and need M&A advisory?',
      'Are you scaling rapidly and need stronger financial controls?',
      'What level of support do you need - part-time, project-based, or interim?',
      'Do you currently have board-level financial reporting in place?',
    ],
    engagementQuestions: [
      'A full-time CFO often costs 150,000 GBP+ per year. Would you like to discuss a flexible fractional model that fits your budget?',
    ],
    features: [
      'Financial strategy development aligned with business goals',
      'Board-level reporting for stakeholders and investors',
      'Investor relations support for fundraising and due diligence',
      'KPI development and monitoring',
      'M&A advisory including valuations and deal structuring',
      'Financial risk management and mitigation',
    ],
  },
  {
    name: 'Business Advisory',
    description:
      'Strategic business guidance at every stage, from company formation and structuring to mergers, acquisitions and exit planning. Covers business planning, M&A support, exit strategy, corporate governance and long-term strategic planning.',
    qualifyingQuestions: [
      'What stage is your business at - startup, growth, turnaround or planning an exit?',
      'Are you considering company formation and need structuring advice?',
      'Are you planning a merger, acquisition or sale?',
      'Do you have a business plan or financial forecast for growth?',
      'Are you looking to establish proper corporate governance?',
    ],
    engagementQuestions: [
      'Would you like a free strategy session to map out the next stage of your business journey?',
    ],
    features: [
      'Company formation and business structuring guidance',
      'Business planning and financial forecasting',
      'M&A support: due diligence, valuations and transactions',
      'Exit strategy planning to maximize value',
      'Corporate governance frameworks and board structures',
      'Startup, growth, turnaround and restructuring advisory',
    ],
  },
  {
    name: 'Website Development & SEO',
    description:
      'Custom, SEO-optimised website design and development. We build mobile-first websites using WordPress, Shopify, WooCommerce, React and Next.js, plus e-commerce solutions, performance optimisation, maintenance and SEO that drives organic traffic and leads.',
    qualifyingQuestions: [
      'Do you need a brand new website or a redesign of your existing one?',
      'Are you looking for an e-commerce store or a brochure/lead-generation site?',
      'Which platform do you prefer - WordPress, Shopify, or a custom build?',
      'Do you need ongoing SEO services to rank higher on Google?',
      'What is the primary goal - more traffic, leads, or online sales?',
    ],
    engagementQuestions: [
      'Did you know a beautifully designed website means nothing if no one can find it? Our SEO services ensure you rank on Google and attract qualified leads.',
    ],
    features: [
      'Bespoke custom website design',
      'Mobile-first responsive development',
      'E-commerce solutions with secure payment integration',
      'On-page, technical and local SEO for UK businesses',
      'Performance and speed optimisation',
      'Ongoing maintenance, updates and security monitoring',
    ],
  },
  {
    name: 'Social Media Management',
    description:
      'Strategic social media management across Facebook, Instagram, LinkedIn, Twitter/X, TikTok and YouTube. Includes custom strategy, content creation, community management, paid advertising and analytics to grow your audience and convert followers into customers.',
    qualifyingQuestions: [
      'Which social media platforms are most relevant to your target audience?',
      'Are you looking to build brand awareness, generate leads, or both?',
      'Do you have an existing social media presence or are you starting from scratch?',
      'Would you like help with paid advertising campaigns?',
      'How much time are you currently spending on social media?',
    ],
    engagementQuestions: [
      'Are you aware of the paid advertising options on Facebook, Instagram and LinkedIn that could generate leads for your business?',
    ],
    features: [
      'Custom social media strategy aligned with business goals',
      'Content creation including posts, graphics and videos',
      'Community management and follower engagement',
      'Targeted paid advertising on Facebook, Instagram and LinkedIn',
      'Detailed analytics and monthly performance reporting',
      'Planned content calendar for consistent presence',
    ],
  },
  {
    name: 'Graphic Design & Branding',
    description:
      'Professional graphic design and branding solutions including logo design, complete brand identity systems, marketing materials, brand guidelines, social media graphics and digital design. Packages range from startup branding to full rebranding projects.',
    qualifyingQuestions: [
      'Do you need a new logo or a complete brand identity?',
      'Are you rebranding or refreshing an existing brand?',
      'What materials do you need - print, digital, social media, or all?',
      'Do you have brand guidelines in place?',
      'What is your timeline and budget for the design project?',
    ],
    engagementQuestions: [
      'A complete brand package includes logos, color palette, typography, business cards and social media assets. Would you like to see what is included?',
    ],
    features: [
      'Distinctive logo design',
      'Complete visual identity systems',
      'Brochures, flyers and marketing materials',
      'Brand guidelines and style guides',
      'Social media graphics for all platforms',
      'Presentations, digital ads and web graphics',
    ],
  },
];

async function main() {
  await prisma.knowledgeEntry.createMany({
    data: knowledge.map(e => ({ clientId: CLIENT_ID, ...e })),
  });
  const servicesSaved = await Promise.all(
    services.map(s => prisma.service.create({ data: { clientId: CLIENT_ID, ...s } })),
  );
  console.log(`Seeded ${knowledge.length} knowledge entries and ${servicesSaved.length} services.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });