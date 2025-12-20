## Chat flow & conversation policy

### Classification (every user message)
Assign one label:
- **New opportunity**: hiring, PM/PO role, contract work, project request, “can you help”, “we need”, “looking for”
- **General talk**: browsing, curiosity, small talk, unrelated questions

Implementation note (prototype): keyword regex is OK; later upgrade to a small router model.

### Chat stages (suggested)
1. **Turn 1**
   - Classify prompt
   - If **New opportunity**:
     - Confirm interest, ask 1 clarifying question (role/company/problem)
     - Open split view and show most relevant experience
   - If **General talk**:
     - Invite browsing or ask what they want to explore
2. **Turn 2–3**
   - Ask: “Do you want to see some more examples of my past experience that would relate to this?”
3. **Turn 3–4**
   - Ask for email:
     - “Can I get your email? I’ll be sure to let the real Jaan know about this — so we can continue the conversation.”
   - Show email input + submit CTA (mocked)

### Safety/UX notes
- Avoid sounding like a real human assistant scheduling without consent; be explicit it’s a website assistant.
- Keep responses short, scannable, and PM-oriented.
- Provide “Browse experience” escape hatch from chat at all times.

### Experience relevance mapping (prototype)
Map keywords → left panel sections:
- **blockchain / web3 / crypto / defi / token / stablecoin** → Guardtime PO pilots
- **fintech / lending / risk / payments / fraud** → 4Finance PM + Guardtime stablecoin
- **enterprise / gov / compliance / GDPR** → 4Finance GDPR + EU DCC + NEOM
- **data / modelling / mobility / analytics** → Positium mobility modelling
- **agile / scrum / transformation / coaching** → Playtech + Guardtime TPM/SM
- **design / web / photography / video** → freelance / portfolio section


