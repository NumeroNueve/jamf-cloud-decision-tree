import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const OFFERINGS = `
## Standard Cloud
- Price: Regular SKU pricing (no hosting add-on)
- SOC 2 Type II + ISO 27001 certified
- Regional hosting (US, EU, APAC)
- Jamf-managed upgrades
- Standard encryption, backups & disaster recovery
- Supports CIS Benchmarks 1 & 2, CMMC, NIST 800-171
- Best for: ~95% of customers without strict compliance or performance needs

## Premium Cloud
- Price: $20,000/year hosting cost
- Customer-controlled upgrade scheduling
- IP safelisting
- Third-party SSL certificate support
- Secure port configuration
- Jamf Log Stream for SIEM integration
- Enhanced performance (more memory, additional nodes, autoscaling)
- Supports CIS 1&2, CMMC, NIST 800-171
- Best for: Orgs needing operational control, security customization, or enhanced performance

## High Compliance Cloud
- Price: $40,000/year hosting cost
- StateRAMP and NIST 800-53 alignment with available audit results
- Dedicated, compliance-certified hosting environment
- Additional access controls and network restrictions
- Mandatory upgrade path (must stay on latest release)
- Elevated monitoring and logging
- Best for: Regulated industries, state/local government, public sector needing infrastructure-level compliance

## Premium Cloud Plus
- Price: $50,000/year hosting cost
- AWS GovCloud hosted (US-only)
- U.S. citizens only can access the environment
- IP safelisting, third-party SSL, secure port config
- Jamf Log Stream for SIEM integration
- Supports FISMA, CJIS, PCI-DSS, DFARS, ITAR, DoD SRG L2/4/5 alignment
- DEPRECATION NOTICE: Will be discontinued Q3-Q4 2026, replaced by FedCloud (FedRAMP-authorized). Do not sell to new customers.
- Best for: Enterprise/government orgs with strict data residency, federal compliance, or GovCloud requirements
`;

const SYSTEM_PROMPT = `You are a Jamf Cloud hosting advisor. Based on the customer situation described, recommend the most appropriate Jamf Cloud offering.

Here are the available offerings:
${OFFERINGS}

Rules:
- Recommend exactly ONE offering as the primary recommendation.
- Be concise and direct.
- Explain WHY this offering fits their situation in 2-3 sentences.
- List the key features that are relevant to their specific needs.
- If Premium Cloud Plus seems like the fit, always mention the deprecation notice and that they should contact their Jamf rep.
- If the description is too vague to determine compliance needs, default to Standard Cloud but mention what would trigger an upgrade.

Respond in this exact JSON format:
{
  "offering": "standard | premium | highcompliance | premiumplus",
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
