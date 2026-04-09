import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const KNOWLEDGE_BASE = `
## Cloud Offerings Overview

### Standard Cloud (Commercial Cloud)
- Price: Regular SKU pricing (no hosting add-on)
- SOC 2 Type II + ISO 27001 certified
- Regional hosting (US, EU, APAC)
- Jamf-managed upgrades on a shared schedule
- Standard encryption, backups & disaster recovery
- Supports CIS Benchmarks 1 & 2, CMMC, NIST 800-171
- Best for: ~95% of customers without strict compliance or performance needs

### Premium Cloud
- Price: $20,000/year hosting add-on
- Customer-controlled upgrade scheduling within Jamf's support window
- Version Control: customers can decide which version of Jamf Pro to run and delay upgrades indefinitely
- IP safelisting
- Third-party SSL certificate support
- Secure port configuration
- Jamf Log Stream for SIEM integration
- Enhanced performance (more memory, additional nodes, autoscaling)
- Supports CIS 1&2, CMMC, NIST 800-171
- Best for: Enterprise orgs needing operational control, security customization, validation testing, or enhanced performance

### High Compliance Cloud
- Price: $40,000/year hosting add-on
- NIST 800-53 Rev 5 alignment with available audit results
- StateRAMP authorized (maintained through at least 1H 2026; customers will be directed to FedCloud or HCC going forward)
- Dedicated, compliance-certified hosting environment (not shared with standard Jamf Cloud)
- Additional access controls and network restrictions
- Mandatory upgrade path: customers MUST stay on latest release (no Version Control)
- Upgrade Control: customers can choose when to upgrade within a window between GA and scheduled mass upgrade (~2 weeks after GA)
- Elevated monitoring and logging
- Compliance Benchmarks & Blueprints support (available May 2026)
- Regional data residency options being rolled out globally
- Best for: Regulated industries, state/local government, defense contractors, public sector needing infrastructure-level compliance
- Note: At launch, does not support Jamf Protect or JSC — primarily focused on device management

### Premium Cloud Plus (DEPRECATED)
- Price: $50,000/year hosting cost
- AWS GovCloud hosted (US-only)
- U.S. citizens only can access the environment
- IP safelisting, third-party SSL, secure port config
- Jamf Log Stream for SIEM integration
- Supports FISMA, CJIS, PCI-DSS, DFARS, ITAR, DoD SRG L2/4/5 alignment
- CRITICAL: Do NOT sell to new customers as of March 2026. Being replaced by Jamf FedCloud.
- Existing customers will be migrated to either High Compliance Cloud or FedCloud
- Migration requires re-enrollment due to FIPS encryption in FedCloud
- Best for: Only existing customers already on this environment

### Jamf FedCloud (Coming Q3 2026)
- Jamf's FedRAMP-authorized offering (pursuing FedRAMP High and DoD IL5)
- FIPS encryption
- US-only support (US citizens on US soil for both technical support and environment access)
- Upgrade Control: 30-day window from GA to forced upgrade to next sequential version
- Will support Blueprints and Compliance Benchmarks
- Customers can begin testing in a functionally equivalent environment in late Q2 2026 (not FedRAMP certified, no FIPS)
- FedCloud production environment expected September 2026
- For NEW LOGO customers needing FedRAMP today: sell High Compliance Cloud or Premium Cloud Plus as interim, with migration to FedCloud upon renewal
- For on-prem federal customers: recommend staying on-prem until FedCloud is available

## On-Premises Policy
- As of January 1, 2025: No new on-prem sales to new logo customers
- Existing customers: 1-year renewals maximum; exceptions require Deal Desk approval and regional leadership sign-off
- On-prem will NOT support Declarative Device Management (DDM) — Apple is deprecating legacy config profile management by late 2026
- Anything outside Jamf Cloud is considered on-prem, even if on customer-owned AWS infrastructure
- All on-prem customers should have a migration plan to cloud within the next year
- Goal: migrate all on-prem customers to cloud by EOY 2027
- On-prem to cloud migration REQUIRES a Professional Services engagement

## Migration Services
1. Standard cloud migration: For customers with no environmental complexity, on a current/acceptable JSS version
2. Forward Deployed service: For customers needing assessment, modernization, and best-practice alignment — includes Discovery, Project Planning, Engagement (weekly work), and post-migration Hypercare

## Bring Your Own Key (BYOK)
- Launched April 1, 2026 (US only, Jamf Pro only)
- Allows admins to encrypt data at rest with a key only they know — Jamf cannot view the encrypted data
- Frankfurt, Germany location support expected September 2026
- Expanding to additional Jamf solutions and data fields over time
- Separate from cloud hosting options but relevant to security-conscious customers

## Upgrade Terminology
- Version Control (Premium Cloud only): Customer chooses which Jamf Pro version to run, can delay indefinitely
- Upgrade Control: Customer can schedule when to upgrade within a compliance window
  - High Compliance Cloud: ~2 week window from GA to mass upgrade
  - FedCloud: 30-day window, upgrade to next sequential version (not latest)
- Standard Cloud: Jamf manages upgrades on shared schedule
- N-2 is NOT available in High Compliance Cloud or FedCloud environments

## Compliance Standards Reference
- NIST 800-53: Information security standard with privacy and security controls catalog; originally for US federal agencies, now general usage
- FedRAMP: Federal Risk and Authorization Management Program; required for any CSP offering services to US federal agencies
- CMMC: Cybersecurity Maturity Model Certification for DoD contractors protecting CUI and FCI
- C5: German government Cloud Computing Compliance Criteria Catalogue from BSI; Jamf pursuing this for German market (2027 target)
- StateRAMP: State-level equivalent of FedRAMP for state and local government
`;

const SYSTEM_PROMPT = `You are a Jamf Cloud hosting advisor helping sellers identify the right cloud environment for their customers. Based on the customer situation described, recommend the most appropriate Jamf Cloud offering.

Here is your knowledge base:
${KNOWLEDGE_BASE}

Rules:
- Recommend exactly ONE offering as the primary recommendation.
- Be concise and direct.
- Explain WHY this offering fits their situation in 2-3 sentences.
- List the key features that are relevant to their specific needs.
- If the customer is on-prem, address the migration path and mention Professional Services requirement.
- If Premium Cloud Plus seems like the fit, ALWAYS note it is deprecated and should not be sold to new customers. Recommend FedCloud (coming Q3 2026) or High Compliance Cloud as alternatives.
- If the customer needs FedRAMP today, explain that FedCloud is targeting Q3 2026 and recommend interim options.
- If BYOK is relevant to their security concerns, mention it as an additional capability.
- If the description is too vague to determine compliance needs, default to Standard Cloud but mention what would trigger an upgrade.
- For federal/defense customers who are currently on-prem, recommend staying on-prem until FedCloud is available.

Respond in this exact JSON format:
{
  "offering": "standard | premium | highcompliance | premiumplus | fedcloud",
  "summary": "2-3 sentence explanation of why this fits",
  "relevant_features": ["feature 1", "feature 2", "feature 3"],
  "considerations": "Optional: anything they should also think about, or null"
}

Respond ONLY with valid JSON, no markdown fences or extra text.`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { description } = req.body;
  if (!description || description.trim().length === 0) {
    return res.status(400).json({ error: "Please describe your customer situation" });
  }

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: description.trim() }],
    });

    const text = message.content[0].text;
    const result = JSON.parse(text);
    return res.status(200).json(result);
  } catch (err) {
    console.error("API error:", err);
    return res.status(500).json({ error: err.message || "Something went wrong. Please try again." });
  }
}
