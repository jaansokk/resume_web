## ARCHIVED
Archived during v2 spec consolidation. Active v2 flow lives in:
- `_specs/user-flow-v2.md`
- `_specs/chat-flow.md`

---

## Chat flow & conversation policy

### Chat Widget Availability
- **Floating widget**: Available on all experience pages (index and individual experience pages)
- **Position**: Fixed at bottom-right on desktop, bottom-center on mobile
- **Behavior**: Expands to show split view when keywords are detected

### Classification (every user message)
Assign one label:
- **New opportunity**: hiring, PM/PO role, contract work, project request, "can you help", "we need", "looking for"
- **General talk**: browsing, curiosity, small talk, unrelated questions


### Chat stages (suggested)
1. **Classification**
   - Classify prompt
   - If **New opportunity** or **keywords detected**:
     - Confirm interest, ask 1 clarifying question (role/company/problem)
     - **Automatically expand to split view** and show most relevant experience
   - If **General talk**:
     - Invite browsing or ask what they want to explore
2. **Examples of experience**
   - Ask: "Do you want to see some more examples of my past experience that would relate to this?"
   - **If keywords detected in subsequent messages**: Expand to split view
3. **Ask for a LinkedIn link or email**
   - Ask:
     - "Can I get your LinkedIn profile? I'll be sure to let the real Jaan know about this — so we can continue the conversation."

### Split View Trigger
- **Automatic expansion**: Split view appears when relevant keywords are detected in any message
- **Keyword matching**: Uses experience relevance mapping (see below) to determine when to show split view
- **Display**: Expands from floating widget to full overlay/modal view showing related experiences

### Safety/UX notes
- Keep responses short, scannable, and PM-oriented.
- Provide “Browse experience” escape hatch from chat at all times.


