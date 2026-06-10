// German translations indexed by the English source string used in `t(...)`.
// Adding a new entry here makes the corresponding English string translate
// to German. Strings missing here render unchanged (i.e. in English).
//
// Conventions:
// - Canonical cryptographic terms (DKG, DLEQ, ElGamal, BLS12-381, Schnorr,
//   keyper) are kept as-is · they're domain vocabulary, not free prose.
// - Protocol field names exposed to the user as identifiers (pseudonym, vk,
//   c1, c2, zkProof, voterSignature, wrAttestation, pkWR, pkElection, mpk)
//   are kept as-is.
// - Code snippets, JSON keys, and CLI commands are not translated.

export const de: Record<string, string> = {
  // ── Top bar ─────────────────────────────────────────────────────────────
  "Add to AI agent": "Zum KI-Agenten hinzufügen",
  "Refresh": "Aktualisieren",

  // ── Add to AI agent page ────────────────────────────────────────────────
  "Back": "Zurück",
  "Add to your AI assistant": "Zu Ihrem KI-Assistenten hinzufügen",
  "Let an AI agent verify this election independently": "Lassen Sie einen KI-Agenten diese Wahl unabhängig verifizieren",
  "Copy the skill below into": "Fügen Sie den Skill unten ein in",
  "or any AI agent with shell access and a terminal. The agent will fetch all election data directly from the blockchain and run every cryptographic check autonomously — no backend, no trust in this dashboard required.":
    "oder einen beliebigen KI-Agenten mit Shell-Zugang und Terminal. Der Agent ruft alle Wahldaten direkt von der Blockchain ab und führt jeden kryptografischen Check autonom durch — kein Backend, kein Vertrauen in dieses Dashboard erforderlich.",
  "Fetch from chain": "Von der Blockchain abrufen",
  "Verify ballots": "Stimmzettel verifizieren",
  "Verify aggregate": "Aggregat verifizieren",
  "Verify shares": "Anteile verifizieren",
  "Verify tally": "Ergebnis verifizieren",
  "Copy Skill": "Skill kopieren",
  "Copied!": "Kopiert!",
  "Download .md": ".md herunterladen",
  "Then paste into your AI agent and say: follow this skill": "In Ihren KI-Agenten einfügen und sagen: follow this skill",
  "Copy": "Kopieren",
  "Refreshing…": "Wird aktualisiert…",
  "Error:": "Fehler:",

  // ── Election selector ───────────────────────────────────────────────────
  "Election": "Wahl",
  "No elections found": "Keine Wahlen gefunden",
  "Loading elections…": "Wahlen werden geladen…",

  // ── Sidebar / navigation ────────────────────────────────────────────────
  "Overview": "Übersicht",
  "OVERVIEW": "ÜBERSICHT",
  "STAGE": "PHASE",
  "VERIFY": "PRÜFEN",
  "CLOSE": "SCHLIESSEN",
  "RESULT": "ERGEBNIS",
  "\"Every ballot encrypted, counted while still encrypted, opened only by a committee acting together.\"":
    "„Jede Stimme verschlüsselt, im verschlüsselten Zustand ausgezählt, nur von einem gemeinsam agierenden Gremium geöffnet.\"",
  "Encryption Keys Set Up": "Encryption Key erstellt",
  "Voters Cast Encrypted Ballots": "Wählende geben verschlüsselte Stimmen ab",
  "Encrypted Vote Counting": "Verschlüsselte Stimmenauszählung",
  "Threshold Decryption": "Threshold Decryption",
  "Final Tally Published": "Endergebnis veröffentlicht",

  "Distributed Key Generation (DKG)": "Verteilte Schlüsselerzeugung (DKG)",
  "Encrypted Ballot Submission": "Abgabe verschlüsselter Stimmen",
  "Homomorphic Aggregation": "Homomorphe Aggregation",
  "Keyper Decryption Shares (DLEQ-proven)": "Keyper Decryption Shares (DLEQ-bewiesen)",
  "Decrypted Result": "Entschlüsseltes Ergebnis",

  // Stage descriptions (long, kept close to the English wording)
  "An independent committee of guardians (keypers) jointly generates the election's encryption key. No single party ever holds the key. Only a threshold of them, acting together, can decrypt anything.":
    "Ein unabhängiges Gremium von Hütern (Keypern) erzeugt gemeinsam den Encryption Key der Wahl. Niemand allein hält den Schlüssel · erst eine Schwellenmenge von ihnen kann zusammen überhaupt etwas entschlüsseln.",
  "Each voter encrypts their choices on their own device. The ciphertext goes to the registry together with proofs that the voter is eligible and stayed within budget. Their actual choices are never revealed.":
    "Jede wählende Person verschlüsselt ihre Auswahl direkt auf dem eigenen Gerät. Nur der Chiffretext wandert in das Register, zusammen mit Beweisen über Wahlberechtigung und Budgeteinhaltung. Die tatsächliche Auswahl bleibt verborgen.",
  "All encrypted ballots are added together without ever decrypting any of them. The combined ciphertext per candidate is still fully encrypted, so nothing about individual votes is revealed.":
    "Alle verschlüsselten Stimmen werden addiert, ohne dass auch nur eine entschlüsselt wird. Der kombinierte Chiffretext pro Kandidat:in bleibt vollständig verschlüsselt · über einzelne Stimmen wird nichts preisgegeben.",
  "A threshold of keypers each contribute one piece of the decryption, with a cryptographic proof that their piece is correct. Only together do these pieces reveal the count. No keyper ever sees the votes alone.":
    "Eine Schwellenmenge an Keypern liefert jeweils einen Anteil der Entschlüsselung · versehen mit einem kryptographischen Beweis, dass der Anteil korrekt ist. Erst zusammen ergeben diese Anteile das Endergebnis; allein sieht kein Keyper jemals die Stimmen.",
  "Once enough keyper shares are combined, the encrypted aggregate decrypts to plain vote counts per candidate, and the winner is determined.":
    "Sobald genug Keyper-Anteile kombiniert sind, wird der verschlüsselte Summenwert in Klartext-Stimmzahlen pro Kandidat:in entschlüsselt und der oder die Sieger:in ermittelt.",

  // ── Overview narrative ──────────────────────────────────────────────────
  "CURRENTLY": "AKTUELL",
  "ELECTION FINALIZED": "WAHL ABGESCHLOSSEN",
  "WHAT COMES NEXT": "WAS ALS NÄCHSTES KOMMT",
  "WHAT YOU CAN DO NOW": "WAS SIE JETZT TUN KÖNNEN",
  "Every stage has completed. The result is published and fully verifiable.":
    "Alle Phasen sind abgeschlossen. Das Ergebnis ist veröffentlicht und vollständig nachprüfbar.",
  "Open any stage below to inspect what happened, then use the right column to re-run that step yourself.":
    "Öffnen Sie links eine Phase, um nachzusehen, was passiert ist, und nutzen Sie die rechte Spalte, um diesen Schritt selbst zu wiederholen.",
  "Open any stage below to inspect what happened.":
    "Öffnen Sie links eine Phase, um nachzusehen, was passiert ist.",
  "Voting hasn't opened yet": "Die Abstimmung hat noch nicht begonnen",
  "Opens today": "Öffnet heute",
  "Voting closing now": "Abstimmung schließt jetzt",
  "Voting has closed": "Die Abstimmung ist beendet",
  "Final tally being published": "Endergebnis wird veröffentlicht",
  "Threshold met · decrypting vote counts": "Schwellenwert erreicht · Stimmzahlen werden entschlüsselt",

  // Stage progress label parts
  "Stage {{n}} of 5 in progress": "Phase {{n}} von 5 läuft",
  "Stage {{n}} of 5 up next": "Phase {{n}} von 5 steht als Nächstes an",

  // Days / counts
  "1 day": "1 Tag",
  "{{n}} days": "{{n}} Tage",
  "Opens in {{label}}": "Öffnet in {{label}}",
  "Closes in {{label}}": "Schließt in {{label}}",
  "{{n}} ballots cast so far": "Bisher {{n}} abgegebene Stimmen",
  "{{n}} ballots accepted": "{{n}} Stimmen angenommen",
  "{{n}} ballots summed": "{{n}} Stimmen aufsummiert",
  "{{n}} total votes counted": "{{n}} Stimmen insgesamt gezählt",
  "{{count}} of {{total}} keyper shares received":
    "{{count}} von {{total}} Keyper-Anteilen erhalten",
  "Need {{n}} valid shares to decrypt":
    "Es werden {{n}} gültige Anteile zur Entschlüsselung benötigt",
  "{{n}} of {{n}} keypers ready": "{{n}} von {{n}} Keypern bereit",
  "Encryption committee finalized": "Encryption Committee abgeschlossen",
  "Voting closed": "Abstimmung beendet",
  "Into {{n}} encrypted candidate totals":
    "in {{n}} verschlüsselte Stimmsummen pro Kandidat:in",
  "Threshold met · tally decrypted": "Schwellenwert erreicht · Auszählung entschlüsselt",

  // Outcome formatters (electionOutcome.ts)
  "No votes recorded": "Keine Stimmen erfasst",
  "Winner: candidate {{i}} · {{votes}} votes": "Sieger: Kandidat:in {{i}} · {{votes}} Stimmen",
  "Tied between {{names}} · {{votes}} votes each":
    "Gleichstand zwischen {{names}} · jeweils {{votes}} Stimmen",
  "Winner: Candidate {{i}} · {{votes}} votes": "Sieger: Kandidat:in {{i}} · {{votes}} Stimmen",
  "Tied: {{names}} · {{votes}} votes each":
    "Gleichstand: {{names}} · jeweils {{votes}} Stimmen",
  "candidate {{i}}": "Kandidat:in {{i}}",
  "Candidate {{i}}": "Kandidat:in {{i}}",
  " and ": " und ",
  ", and ": " und ",

  // ── Stage lifecycle badge ───────────────────────────────────────────────
  "✓ DONE": "✓ ERLEDIGT",
  "IN PROGRESS": "LÄUFT",
  "PENDING": "AUSSTEHEND",

  // ── StageLockedPanel ────────────────────────────────────────────────────
  "This stage hasn't started yet.": "Diese Phase hat noch nicht begonnen.",
  "This stage is completed.": "Diese Phase ist abgeschlossen.",
  "This stage is currently active.": "Diese Phase läuft aktuell.",
  "What this means technically": "Was das technisch bedeutet",
  "WAITING ON": "WARTET AUF",
  "Voting opens": "Abstimmung öffnet",
  "Voting closes": "Abstimmung schließt",
  "This stage will unlock once earlier steps complete.":
    "Diese Phase wird freigeschaltet, sobald frühere Schritte abgeschlossen sind.",
  "The guardian committee must finish distributed key generation before voting can begin.":
    "Das Hüter-Gremium muss die verteilte Schlüsselerzeugung abschließen, bevor die Abstimmung beginnen kann.",
  "Once voting opens, accepted ballots will appear here with automatic validity checks. Until then, this registry stays empty.":
    "Sobald die Abstimmung öffnet, erscheinen angenommene Stimmen hier mit automatischen Gültigkeitsprüfungen. Bis dahin bleibt dieses Register leer.",
  "Once voting closes, the homomorphic sum of every accepted ballot will appear here as one (c1, c2) ciphertext pair per candidate · still encrypted, ready for threshold decryption.":
    "Sobald die Abstimmung endet, erscheint hier die homomorphe Summe aller angenommenen Stimmen als ein (c1, c2)-Chiffretextpaar pro Kandidat:in · weiterhin verschlüsselt und bereit für die Threshold Decryption.",
  "Once the aggregate is published, a table of decryption shares and DLEQ proofs will appear here · one row per keyper, one share per candidate.":
    "Sobald die Aggregation veröffentlicht ist, erscheint hier eine Tabelle mit Decryption Shares und DLEQ-Beweisen · eine Zeile pro Keyper, ein Anteil pro Kandidat:in.",
  "Once a threshold of keyper shares is combined, the decrypted vote count per candidate will appear here · together with the winner and the final per-candidate pie chart.":
    "Sobald eine Schwellenmenge von Keyper-Anteilen kombiniert ist, erscheinen hier die entschlüsselten Stimmzahlen pro Kandidat:in · zusammen mit dem oder der Sieger:in und dem Kreisdiagramm pro Kandidat:in.",

  // ── Ballot detail ───────────────────────────────────────────────────────
  "← Back to ballots": "← Zurück zu den Stimmen",
  "BALLOT": "STIMME",
  "Index {{n}}": "Index {{n}}",
  "VALID": "GÜLTIG",
  "INVALID": "UNGÜLTIG",
  "Verifying…": "Wird geprüft…",
  "Pending": "Ausstehend",
  "Verification will run automatically.": "Die Prüfung läuft automatisch.",
  "Running cryptographic checks in the background.":
    "Kryptographische Prüfungen laufen im Hintergrund.",
  "All cryptographic checks passed · WR attestation, ZK proofs, voter signature, field decoding.":
    "Alle kryptographischen Prüfungen bestanden · WR-Attestierung, ZK-Beweise, Wähler:innen-Signatur, Feld-Decodierung.",
  "DETAILS": "DETAILS",
  "candidate {{n}}": "Kandidat:in {{n}}",
  "({{n}} bytes)": "({{n}} Byte)",

  // ── Election header ─────────────────────────────────────────────────────
  "Election #{{n}}": "Wahl Nr. {{n}}",
  "A secret-ballot vote for the workers' council.":
    "Eine geheime Abstimmung für den Personalrat.",
  "SWITCH ELECTION": "WAHL WECHSELN",
  "No elections loaded": "Keine Wahlen geladen",
  "Voting Opens": "Abstimmung öffnet",
  "Voting Closes": "Abstimmung schließt",
  "Candidates on the Ballot": "Kandidat:innen auf dem Stimmzettel",
  "people running": "Personen treten an",
  "Vote Points per Voter": "Stimmpunkte pro Wähler:in",
  "point(s) each": "Punkt(e) jeweils",
  "Each voter gets {{budget}} points to distribute across the {{candidates}} candidates.":
    "Jede:r Wähler:in erhält {{budget}} Punkte, um sie auf die {{candidates}} Kandidat:innen zu verteilen.",
  "Key Guardians": "Schlüssel-Hüter",
  "{{t}} of {{n}}": "{{t}} von {{n}}",
  "must agree": "müssen zustimmen",
  "An independent committee. Only when {{t}} of them combine their keys can the result be decrypted · no single guardian can ever see the votes alone.":
    "Ein unabhängiges Gremium. Erst wenn {{t}} von ihnen ihre Schlüssel kombinieren, kann das Ergebnis entschlüsselt werden · kein einzelner Hüter kann jemals die Stimmen allein einsehen.",

  // ── Trust section ───────────────────────────────────────────────────────
  "HOW THIS ELECTION IS KEPT HONEST": "WIE DIESE WAHL EHRLICH BLEIBT",
  "Every step is public, signed, and cryptographically proven.":
    "Jeder Schritt ist öffentlich, signiert und kryptographisch bewiesen.",
  "Every action on this election · key setup, ballot submission, counting, decryption · is recorded on-chain with a signature and a":
    "Jede Aktion in dieser Wahl · Schlüsseleinrichtung, Stimmabgabe, Auszählung, Entschlüsselung · wird On-Chain mit einer Signatur und einem",
  "zero-knowledge proof": "Zero-Knowledge-Beweis",
  "of correctness. Anyone, including you, can re-run any proof to confirm.":
    "der Korrektheit festgehalten. Jede:r · auch Sie · kann jeden Beweis selbst nachvollziehen.",
  "Votes are counted while still encrypted.":
    "Stimmen werden ausgezählt, während sie verschlüsselt bleiben.",
  "Using": "Mittels",
  "homomorphic tallying": "homomorpher Auszählung",
  ", encrypted ballots are added together so the totals appear without ever decrypting any individual ballot. You can inspect every ciphertext on-chain and re-verify the tallying authority's proofs that the count is correct.":
    " werden verschlüsselte Stimmen addiert, sodass die Summen erscheinen, ohne dass eine einzelne Stimme entschlüsselt wird. Sie können jeden Chiffretext On-Chain einsehen und die Beweise der Auszählungsstelle eigenständig nachprüfen.",

  // Verify-yourself section (shared)
  "VERIFY YOURSELF": "SELBST PRÜFEN",
  "Don't trust this panel · re-run the same cryptographic check yourself, against this stage's on-chain data, on your own machine.":
    "Vertrauen Sie diesem Panel nicht · führen Sie dieselbe kryptographische Prüfung selbst aus, gegen die On-Chain-Daten dieser Phase, auf Ihrem eigenen Rechner.",
  "Once this stage completes, you'll be able to re-run its cryptographic check on your own machine · same code, same fixtures, no trust in the dashboard required.":
    "Sobald diese Phase abgeschlossen ist, können Sie ihre kryptographische Prüfung auf Ihrem eigenen Rechner wiederholen · derselbe Code, dieselben Fixtures, kein Vertrauen in das Dashboard nötig.",
  "Open manual verification guide →": "Manuelle Prüfungsanleitung öffnen →",
  "Hide verification guide ↑": "Prüfungsanleitung ausblenden ↑",
  "Manual verification not available yet": "Manuelle Prüfung noch nicht verfügbar",

  // ── Ballot list ─────────────────────────────────────────────────────────
  "Search by pseudonym": "Nach Pseudonym suchen",
  "No ballots match that prefix.": "Kein Stimmzettel entspricht diesem Präfix.",
  "Searching all {{n}} ballots…": "Durchsuche alle {{n}} Stimmzettel…",
  "across all ballots": "in allen Stimmzetteln",
  "{{n}} of {{total}} match": "{{n}} von {{total}} entsprechen",
  "Prev": "Zurück",
  "Next": "Weiter",
  "TALLY": "AUSZÄHLUNG",
  "KEYPERS USED": "VERWENDETE KEYPER",
  "DLEQ OK": "DLEQ OK",
  "DLEQ FAIL": "DLEQ FEHLER",
  "Verify DLEQ": "DLEQ prüfen",
  "Verify DLEQ proof for this share": "DLEQ-Beweis für diesen Anteil prüfen",
  "{{n}} valid": "{{n}} gültig",
  "{{n}} invalid": "{{n}} ungültig",
  "{{n}} checking": "{{n}} wird geprüft",
  "on this page": "auf dieser Seite",
  "Loading…": "Wird geladen…",
  "Loading shares…": "Anteile werden geladen…",
  "Exporting…": "Wird exportiert…",
  "Export Ballots": "Stimmen exportieren",
  "total {{n}}": "gesamt {{n}}",
  "page size {{n}}": "Seitengröße {{n}}",
  "page {{n}}/{{total}}": "Seite {{n}}/{{total}}",
  "go to": "gehe zu",
  "shares submitted: {{n}}": "abgegebene Anteile: {{n}}",
  "KEYPER": "KEYPER",
  "SUBMITTED": "ABGEGEBEN",
  "CANDIDATE {{n}}": "KANDIDAT:IN {{n}}",
  "Checking…": "Wird geprüft…",
  "share": "Anteil",
  "proof (DLEQ)": "Beweis (DLEQ)",
  "{{t}} of {{n}} keypers": "{{t}} von {{n}} Keypern",
  "DKG finalized": "DKG abgeschlossen",
  "Yes": "Ja",
  "No": "Nein",
  "Whitelist Registrar Key": "Whitelist-Registrar-Schlüssel",
  "KEYPER COMMITTEE": "KEYPER-KOMITEE",
  "No aggregate published yet. The tally aggregator will homomorphically sum accepted ballots after voting closes.":
    "Noch kein Aggregat veröffentlicht. Der Auszählungs-Aggregator wird nach Abstimmungsende die angenommenen Stimmen homomorph aufsummieren.",
  "candidates: {{n}}": "Kandidat:innen: {{n}}",
  "The aggregate is the encrypted combined vote per candidate: every accepted ballot ciphertext is added together (homomorphic encrypted sum). You still only see ciphertexts here · the actual vote counts stay hidden until keypers submit decryption shares.":
    "Das Aggregat ist die verschlüsselte Gesamtstimme pro Kandidat:in: Jeder Chiffretext einer angenommenen Stimme wird addiert (homomorphe verschlüsselte Summe). Hier sehen Sie weiterhin nur Chiffretexte · die tatsächlichen Stimmzahlen bleiben verborgen, bis Keyper ihre Decryption Shares einreichen.",
  "No decryption shares submitted yet. Keypers publish one share per candidate once the aggregate is on-chain.":
    "Noch keine Decryption Shares eingereicht. Keyper veröffentlichen einen Anteil pro Kandidat:in, sobald das Aggregat On-Chain ist.",
  "Verify DLEQ checks that a keyper's decryption share matches the published aggregate ciphertext and that keyper's committee public key · their piece of the decryption was computed correctly, without exposing private key material.":
    "„DLEQ prüfen\" stellt fest, dass der Decryption Share eines Keypers zum veröffentlichten Aggregat-Chiffretext und zu seinem öffentlichen Komitee-Schlüssel passt · sein Teilstück der Entschlüsselung wurde korrekt berechnet, ohne privates Schlüsselmaterial offenzulegen.",
  "No result published yet. Once enough keyper shares are combined, the decrypted tally will appear here.":
    "Noch kein Ergebnis veröffentlicht. Sobald genug Keyper-Anteile kombiniert sind, erscheint hier die entschlüsselte Auszählung.",
  "{{n}} candidates · {{votes}} votes": "{{n}} Kandidat:innen · {{votes}} Stimmen",
  "Indices: {{list}}": "Indizes: {{list}}",
  "Copy pseudonym": "Pseudonym kopieren",
  "Copy DLEQ proof": "DLEQ-Beweis kopieren",

  // ── STAGE_TECH ("What this means technically" rich text) ────────────────
  // Indices in <N> map to the `components` prop array passed to <Trans>.
  "STAGE_TECH_DKG":
    "Eine <0>t-von-n Schwelle</0>-<1>DKG</1> erzeugt einen gemeinsamen öffentlichen Schlüssel in G₂, dessen privates Gegenstück in n geheime Anteile aufgeteilt wird, einen pro <2>Keyper</2>. Beliebige t von ihnen zusammen können entschlüsseln, weniger nicht. Komitee-Schlüssel und Stimmen verwenden <3>BLS12-381</3>.",
  "STAGE_TECH_BALLOTS":
    "Stimmen tragen pro Kandidat:in einen <0>ElGamal</0>-<1>Chiffretext</1>, eine G₁-<2>Schnorr-Signatur</2> über die Stimm-Bytes, eine G₁-<3>Whitelist-Registrar</3>-Attestierung, dass die wählende Person auf der registrierten Liste steht, und <4>ZK-Bereichsbeweise</4>, dass jede Stimme innerhalb des Wahl-<5>Budgets</5> liegt. Alles auf <6>BLS12-381</6>.",
  "STAGE_TECH_AGGREGATE":
    "Komponentenweise Addition jedes angenommenen Stimm-<0>Chiffretexts</0> auf <1>BLS12-381</1> G₂ (c1 und c2 werden jeweils einzeln punktweise addiert). Das Aggregat ist ein (c1, c2)-Paar pro Kandidat:in. Es wird kein privates Schlüsselmaterial berührt.",
  "STAGE_TECH_SHARES":
    "Jeder <0>Keyper</0> veröffentlicht eine partielle Entschlüsselung σ_i = s_i · C₁ auf dem Aggregat-Chiffretext pro Kandidat:in, wobei s_i sein geheimer Anteil ist. Ein nicht-interaktiver <1>DLEQ-Beweis</1> bindet σ_i an den öffentlichen Komitee-Schlüssel (G₂). Beliebige t gültige Anteile werden per <2>Lagrange kombiniert</2> zum Entschlüsselungsfaktor, ohne jemals einen privaten Schlüssel zusammenzusetzen.",
  "STAGE_TECH_RESULT":
    "Der <0>Lagrange-kombinierte</0> Entschlüsselungsfaktor entfernt die Verschlüsselungsmaske vom Aggregat-<1>Chiffretext</1> jeder/jedes Kandidat:in (G₂). Eine begrenzte <2>Baby-Step / Giant-Step</2>-Suche in G₂ gewinnt die Stimmzahl pro Kandidat:in als Ganzzahl zurück.",

  // ── Easy mode (einfach) strings ─────────────────────────────────────────

  // Overview quote
  "Every vote is sealed and can only be opened when enough guardians work together.":
    "Jede Stimme ist versiegelt und kann nur geöffnet werden, wenn genug Hüter zusammenarbeiten.",

  // Trust cards (easy)
  "Everything is recorded and anyone can check it.":
    "Alles wird aufgezeichnet und jeder kann es prüfen.",
  "Every action in this election — setting up the lock, casting votes, counting, and unlocking — is written down. Anyone, including you, can check that every step was done correctly.":
    "Jeder Schritt dieser Wahl — Schloss einrichten, Stimmen abgeben, zählen und öffnen — wird festgehalten. Jede:r, auch Sie, kann prüfen, ob alles korrekt abgelaufen ist.",
  "Nobody sees your vote. Only the final totals are revealed.":
    "Niemand sieht Ihre Stimme. Nur das Gesamtergebnis wird enthüllt.",
  "All votes are counted without anyone opening a single one. You can check the final results yourself — no need to trust this dashboard.":
    "Alle Stimmen werden gezählt, ohne dass auch nur eine geöffnet wird. Sie können das Endergebnis selbst prüfen — kein Vertrauen in das Dashboard nötig.",

  // Stage descriptions (easy)
  "A group of independent guardians set up a special lock for this election. No single guardian holds the full key — they only work together.":
    "Eine Gruppe unabhängiger Hüter richtet ein besonderes Schloss für diese Wahl ein. Kein einzelner Hüter hat den vollständigen Schlüssel — sie arbeiten nur gemeinsam.",
  "Each voter sends their choice in a sealed envelope that nobody can open. Only the final totals are ever shown — not individual votes.":
    "Jede wählende Person sendet ihre Wahl in einem versiegelten Umschlag, den niemand öffnen kann. Nur das Gesamtergebnis wird angezeigt — keine einzelnen Stimmen.",
  "All the sealed votes are added up together without anyone opening a single one. The totals appear while every vote stays sealed.":
    "Alle versiegelten Stimmen werden zusammengezählt, ohne dass auch nur eine geöffnet wird. Die Summen erscheinen, während jede Stimme versiegelt bleibt.",
  "Each guardian contributes a small piece to unlock the final count. No single guardian can see the votes alone.":
    "Jeder Hüter gibt ein kleines Stück, um das Endergebnis freizugeben. Kein einzelner Hüter kann die Stimmen allein sehen.",
  "When enough guardians work together, the final vote counts are revealed and the winner is announced.":
    "Wenn genug Hüter zusammenarbeiten, werden die Stimmzahlen enthüllt und der Gewinner bekannt gegeben.",

  // Stage 1 DKG analogy view (easy)
  "{{t}} of {{n}} — no single guardian can act alone":
    "{{t}} von {{n}} — kein einzelner Hüter kann allein handeln",
  "A shared lock that seals every ballot. Anyone can use it to seal a vote — only the guardians together can ever open it.":
    "Ein gemeinsames Schloss, das jeden Stimmzettel versiegelt. Jeder kann es zum Versiegeln nutzen — nur die Hüter gemeinsam können es jemals öffnen.",
  "Confirms each voter is on the official eligibility list.":
    "Bestätigt, dass jede:r Wähler:in auf der offiziellen Wahlliste steht.",
  "Each holds one piece of the key. {{t}} of {{n}} must work together — no single guardian can unlock the results alone.":
    "Jeder hält ein Stück des Schlüssels. {{t}} von {{n}} müssen zusammenarbeiten — kein einzelner Hüter kann das Ergebnis allein freigeben.",
  "Guardian {{n}}": "Hüter {{n}}",

  // Stage 2 ballot stats (easy)
  "votes received": "Stimmen eingegangen",
  "Checking all {{n}} votes…": "Alle {{n}} Stimmen werden geprüft…",
  "{{n}} checked and valid": "{{n}} geprüft und gültig",
  "{{n}} being checked…": "{{n}} werden geprüft…",
  "{{n}} did not pass": "{{n}} ungültig",
  "Every vote is sealed. Nobody can open it or see the choice inside — not even the election organizers.":
    "Jede Stimme ist versiegelt. Niemand kann sie öffnen oder den Inhalt sehen — nicht einmal die Wahlorganisatoren.",

  // Stage 3 aggregate analogy view (easy)
  "Sealed total — hidden until guardians unlock": "Versiegelte Summe — verborgen bis die Hüter öffnen",
  "All votes were added together while still sealed — like counting closed envelopes without opening any. The totals stay hidden until the guardians work together to open them.":
    "Alle Stimmen wurden zusammengezählt, während sie versiegelt blieben — wie das Zählen geschlossener Umschläge ohne einen zu öffnen. Die Summen bleiben verborgen, bis die Hüter gemeinsam öffnen.",

  // Stage 4 shares analogy view (easy)
  "{{n}} of {{total}} guardians contributed": "{{n}} von {{total}} Hütern haben ihren Teil beigetragen",
  "Guardian": "Hüter",
  "Submitted": "Eingereicht",
  "Contributed their piece of the key — checked and verified.":
    "Hat seinen Teil des Schlüssels beigesteuert — geprüft und bestätigt.",
  "Each guardian holds one piece. Once {{t}} pieces are combined, the sealed totals are opened and the real vote counts appear.":
    "Jeder Hüter hält ein Stück. Sobald {{t}} Stücke kombiniert werden, werden die versiegelten Summen geöffnet und die echten Stimmzahlen erscheinen.",

  // Stage 5 result (easy)
  "Guardians who helped": "Hüter, die geholfen haben",

  // Stage 1 DKG summary (easy)
  "All {{n}} guardians are set up. {{t}} of them must work together to reveal the final results.":
    "Alle {{n}} Hüter sind bereit. {{t}} von ihnen müssen zusammenarbeiten, um das Endergebnis freizugeben.",
  "The guardians are still setting up. {{t}} of {{n}} must be ready before voting can begin.":
    "Die Hüter richten noch ein. {{t}} von {{n}} müssen bereit sein, bevor die Abstimmung beginnen kann.",

  // Stage 3 aggregate (easy)
  "The sealed vote totals haven't been published yet. They will appear here once voting ends.":
    "Die versiegelten Stimmensummen wurden noch nicht veröffentlicht. Sie erscheinen hier, sobald die Abstimmung endet.",
  "The sealed vote totals for all {{n}} candidates are stored here. The actual vote counts are still hidden — they will only be revealed once the guardians work together.":
    "Die versiegelten Stimmensummen für alle {{n}} Kandidat:innen sind hier gespeichert. Die tatsächlichen Stimmzahlen sind noch verborgen — sie werden erst enthüllt, wenn die Hüter zusammenarbeiten.",

  // Stage 4 shares (easy)
  "No guardian has submitted their piece yet.":
    "Noch kein Hüter hat seinen Teil eingereicht.",
  "{{n}} guardian(s) have submitted their piece so far.":
    "{{n}} Hüter haben bisher ihren Teil eingereicht.",

  // StageLockedPanel hints (easy)
  "The guardians need to finish setting up the election lock first.":
    "Die Hüter müssen zuerst das Wahlschloss einrichten.",
  "Once voting starts, the sealed votes will appear here.":
    "Sobald die Abstimmung beginnt, erscheinen die versiegelten Stimmen hier.",
  "Once voting ends, the vote totals will appear here, still sealed.":
    "Sobald die Abstimmung endet, erscheinen die versiegelten Stimmensummen hier.",
  "Once the totals are published, the guardians will begin unlocking the final count.":
    "Sobald die Summen veröffentlicht sind, beginnen die Hüter, das Endergebnis freizugeben.",
  "Once enough guardians contribute their piece, the final vote counts will appear here.":
    "Sobald genug Hüter ihren Teil beigesteuert haben, erscheinen hier die Stimmzahlen.",

  // ── Footer ──────────────────────────────────────────────────────────────
  "Developed for City of Munich": "Entwickelt für die Stadt München",
  "Powered by Bundeswehr Universität München × Votebase × brainbot/Shutter":
    "Betrieben von der Universität der Bundeswehr München × Votebase × brainbot/Shutter",

  // ── Glossary (Term.tsx) ─────────────────────────────────────────────────
  // Canonical terms (DKG, DLEQ, ElGamal, BLS12-381, Schnorr) stay as titles.
  // Bodies are translated.
  "A way for a committee to jointly produce a shared encryption key. The matching decryption key is split into pieces; no single member ever holds the whole thing.":
    "Ein Verfahren, mit dem ein Gremium gemeinsam einen geteilten Encryption Key erzeugt. Der zugehörige Decryption Key wird in Anteile aufgeteilt; kein einzelnes Mitglied hält jemals den vollständigen Schlüssel.",
  "An elliptic curve optimised for pairing-based cryptography. Used here for threshold key generation, ballot proofs, and keyper share verification.":
    "Eine elliptische Kurve, optimiert für paarungsbasierte Kryptographie. Hier verwendet für Schwellenwert-Schlüsselerzeugung, Stimm-Beweise und Prüfung der Keyper-Anteile.",
  "Budget": "Budget",
  "The number of points each voter has to distribute. With a budget of 3, you might give 3 to one candidate, or 1+1+1 across three, or 2+1, etc. Each per-candidate value must stay within range · the ZK range proof guarantees this.":
    "Die Anzahl der Punkte, die jede:r Wähler:in verteilen kann. Bei einem Budget von 3 sind etwa 3 für eine:n Kandidat:in, 1+1+1 auf drei verteilt oder 2+1 möglich. Jeder Wert pro Kandidat:in muss innerhalb des Bereichs liegen · der ZK-Bereichsbeweis stellt dies sicher.",
  "Zero-knowledge Proof": "Zero-Knowledge-Beweis",
  "Math that lets one party prove a statement is true without revealing the underlying secret. Here, it proves things like 'this vote is in range' or 'this decryption share is correct' · without revealing the vote or the secret share.":
    "Mathematik, mit der eine Partei eine Aussage als wahr belegen kann, ohne das zugrundeliegende Geheimnis preiszugeben. Hier wird damit etwa bewiesen, dass „diese Stimme liegt im Bereich\" oder „dieser Decryption Share ist korrekt\" · ohne die Stimme oder den geheimen Anteil offenzulegen.",
  "Homomorphic tallying": "Homomorphe Auszählung",
  "Homomorphic aggregation · adding encrypted values together so the result is the encryption of the sum. The contract never sees individual votes, only the encrypted total.":
    "Homomorphe Aggregation · verschlüsselte Werte werden addiert, sodass das Ergebnis die Verschlüsselung der Summe ist. Der Vertrag sieht nie einzelne Stimmen, sondern nur die verschlüsselte Gesamtsumme.",
  "DLEQ proof": "DLEQ-Beweis",
  "Discrete-log equality proof · a tiny piece of math each keyper publishes alongside their decryption share. It proves the share matches their committee public key, so a bad share can't slip through.":
    "Diskreter-Logarithmus-Gleichheitsbeweis · ein kleiner mathematischer Beleg, den jeder Keyper zusammen mit seinem Decryption Share veröffentlicht. Er zeigt, dass der Anteil zum öffentlichen Komitee-Schlüssel passt, sodass kein fehlerhafter Anteil unbemerkt durchkommt.",
  "Keypers": "Keyper",
  "The independent committee members who jointly hold the election's decryption key. A threshold of them must cooperate to decrypt; no single keyper can act alone.":
    "Die unabhängigen Komitee-Mitglieder, die gemeinsam den Decryption Key der Wahl halten. Eine Schwellenmenge von ihnen muss kooperieren, um zu entschlüsseln; kein einzelner Keyper kann allein handeln.",
  "t-of-n Threshold": "t-von-n Schwellenwert",
  "Any t members of a committee of n can act together to produce an output (e.g., decrypt), but fewer than t cannot. This prevents a single point of failure or compromise.":
    "Beliebige t Mitglieder eines Komitees von n können gemeinsam ein Ergebnis erzeugen (z. B. entschlüsseln); weniger als t reichen nicht. Das verhindert einen Single-Point-of-Failure oder eine Kompromittierung.",
  "ElGamal Encryption": "ElGamal-Verschlüsselung",
  "Threshold ElGamal in G₂ · ciphertexts (c1, c2) can be added homomorphically. The encryption of a sum equals the sum of encryptions. That's what lets us add ballots together while they stay encrypted.":
    "Schwellen-ElGamal in G₂ · Chiffretexte (c1, c2) lassen sich homomorph addieren. Die Verschlüsselung einer Summe entspricht der Summe der Verschlüsselungen. Genau das ermöglicht es, Stimmen zu addieren, während sie verschlüsselt bleiben.",
  "Schnorr Signature": "Schnorr-Signatur",
  "A compact digital signature on G₁ used here by voters (and the whitelist registrar) to authenticate ballot bytes · proving they created it without revealing any private key material.":
    "Eine kompakte digitale Signatur auf G₁, hier von Wähler:innen (und vom Whitelist-Registrar) verwendet, um Stimm-Bytes zu authentifizieren · sie belegt die Urheberschaft, ohne privates Schlüsselmaterial preiszugeben.",
  "Lagrange interpolation": "Lagrange-Interpolation",
  "Lagrange combination · the standard way to reconstruct a value from t-of-n shares. We use it on the decryption side so no one ever assembles the full private key in memory.":
    "Lagrange-Kombination · der Standardweg, einen Wert aus t-von-n Anteilen zu rekonstruieren. Wir verwenden sie auf der Entschlüsselungsseite, sodass niemand den vollständigen privaten Schlüssel im Speicher zusammensetzt.",
  "Ciphertext": "Chiffretext",
  "An encrypted value. With ElGamal on this curve, every ciphertext is a pair of points labelled (c1, c2).":
    "Ein verschlüsselter Wert. Mit ElGamal auf dieser Kurve ist jeder Chiffretext ein Punktpaar mit der Bezeichnung (c1, c2).",
  "The encrypted total per candidate is decrypted into a plain integer count. The winner is determined and the result is published on-chain.":
    "Die verschlüsselte Gesamtsumme pro Kandidat:in wird in eine reine Ganzzahl entschlüsselt. Der oder die Sieger:in wird ermittelt und das Ergebnis On-Chain veröffentlicht.",
  "Baby-step / Giant-step": "Baby-Step / Giant-Step",
  "An algorithm that efficiently recovers a small plaintext integer from a discrete-log in G₂ · used to decode the vote count after threshold decryption.":
    "Ein Algorithmus, der eine kleine Klartext-Ganzzahl effizient aus einem diskreten Logarithmus in G₂ wiederherstellt · wird genutzt, um die Stimmzahl nach der Threshold Decryption zu dekodieren.",
  "Keyper": "Keyper",
  "A member of the decryption committee. Each one holds one share of the decryption key and publishes one piece of the final decryption.":
    "Ein Mitglied des Decryption Committee. Jede:r hält einen Anteil des Decryption Keys und veröffentlicht ein Teilstück der finalen Entschlüsselung.",
  "Threshold": "Schwellenwert",
  "How many of the N committee members must combine their pieces before anything can be decrypted. With 3 of 5, any three of the five working together is enough · but two or fewer learn nothing.":
    "Wie viele der N Komitee-Mitglieder ihre Teile kombinieren müssen, bevor überhaupt etwas entschlüsselt werden kann. Bei 3 von 5 reichen beliebige drei der fünf, die zusammenarbeiten · zwei oder weniger erfahren nichts.",
  "Election Public Key": "Öffentlicher Wahlschlüssel",
  "The public key that voters use to encrypt their ballots. Anyone can encrypt with it; only the keyper committee · acting together · can ever decrypt anything with it.":
    "Der öffentliche Schlüssel, den Wähler:innen zur Verschlüsselung ihrer Stimmen nutzen. Jede:r kann damit verschlüsseln; entschlüsseln können nur die Keyper gemeinsam.",
  "Whitelist Registrar": "Whitelist-Registrar",
  "An off-chain service that signs an attestation saying \"this voter appears on the official eligibility list\". The dashboard checks that signature on every ballot.":
    "Ein Off-Chain-Dienst, der eine Attestierung signiert, dass „diese:r Wähler:in auf der offiziellen Wahlberechtigtenliste steht\". Das Dashboard prüft diese Signatur für jede Stimme.",
  "Keyper Committee": "Keyper-Komitee",
  "The independent group of guardians who jointly hold the election's decryption key. Each member holds one share; only when enough members combine their shares can anything be decrypted.":
    "Die unabhängige Gruppe von Hütern, die gemeinsam den Decryption Key der Wahl halten. Jedes Mitglied hält einen Anteil; erst wenn genug Mitglieder ihre Anteile kombinieren, kann überhaupt etwas entschlüsselt werden.",
  "Each keyper publishes one piece of the decryption together with a tiny proof that the piece is correct. Only when enough pieces are combined does the result emerge.":
    "Jeder Keyper veröffentlicht ein Teilstück der Entschlüsselung zusammen mit einem kleinen Beweis, dass das Teilstück korrekt ist. Erst wenn genug Teile kombiniert sind, ergibt sich das Ergebnis.",
  "Each voter encrypts their ballot in their own browser and sends only the ciphertext on-chain, together with proofs of eligibility and validity.":
    "Jede:r Wähler:in verschlüsselt die eigene Stimme im eigenen Browser und sendet nur den Chiffretext On-Chain, zusammen mit Beweisen für Wahlberechtigung und Gültigkeit.",

  // ── Verify panels (shared) ──────────────────────────────────────────────
  "Install the Shutter crypto SDK": "Shutter Crypto SDK installieren",
  "Write and run the verification script": "Prüfskript schreiben und ausführen",
  "Write and run a verification script": "Prüfskript schreiben und ausführen",
  "Save as": "Speichern als",
  "next to the fixture, then run:": "neben der Fixture-Datei, dann ausführen:",
  "in the same directory as the fixture, then run:":
    "im selben Verzeichnis wie die Fixture-Datei, dann ausführen:",
  "Expected output": "Erwartete Ausgabe",
  "WHAT'S BEING CHECKED": "WAS GEPRÜFT WIRD",

  // VerifyBallotPanel
  "Local verification guide": "Lokale Prüfungsanleitung",
  "RE-VERIFY THIS BALLOT LOCALLY": "DIESE STIMME LOKAL ERNEUT PRÜFEN",
  "Ballot Index {{n}}": "Stimme Nr. {{n}}",
  "Run the same cryptographic checks the dashboard performs, on your own machine, against this specific ballot. A clean local check means you don't need to trust the dashboard.":
    "Führen Sie dieselben kryptographischen Prüfungen wie das Dashboard auf Ihrem eigenen Rechner für genau diese Stimme aus. Eine erfolgreiche lokale Prüfung bedeutet, dass Sie dem Dashboard nicht vertrauen müssen.",
  "Download this ballot's fixture": "Fixture-Datei dieser Stimme herunterladen",
  "A self-contained JSON file with all election parameters and this ballot only.":
    "Eine eigenständige JSON-Datei mit allen Wahlparametern und ausschließlich dieser Stimme.",
  "Exit code 0 = all checks passed. Exit code 1 = ballot is invalid.":
    "Exit-Code 0 = alle Prüfungen bestanden. Exit-Code 1 = Stimme ist ungültig.",
  "WR attestation": "WR-Attestierung",
  "The voter's pseudonym is registered for this election.":
    "Das Pseudonym der wählenden Person ist für diese Wahl registriert.",
  "is signed by the election authority's Schnorr key (pkWR), verified via":
    "ist mit dem Schnorr-Schlüssel der Wahlleitung (pkWR) signiert und wird verifiziert über",
  "ZK range proofs": "ZK-Bereichsbeweise",
  "For each candidate, a zero-knowledge proof shows the encrypted vote is within the allowed budget · no over-voting, without revealing the actual choice.":
    "Für jede:n Kandidat:in zeigt ein Zero-Knowledge-Beweis, dass die verschlüsselte Stimme innerhalb des erlaubten Budgets liegt · kein Überstimmen, ohne die Auswahl preiszugeben.",
  "Voter Schnorr signature": "Schnorr-Signatur der Wähler:in",
  "The ballot bytes are bound to the voter's ephemeral public key (vk), preventing replay or modification after submission.":
    "Die Stimm-Bytes sind an den ephemeren öffentlichen Schlüssel (vk) der Wähler:in gebunden und schützen so vor Replay oder nachträglicher Änderung.",
  "Field decoding": "Feld-Decodierung",
  "vk and Schnorr components are decoded as compressed G₁ points (48 bytes); ciphertexts (c1, c2) and the election public key as G₂ (96 bytes) · all subgroup-checked before verification runs.":
    "vk und Schnorr-Komponenten werden als komprimierte G₁-Punkte (48 Byte) decodiert, Chiffretexte (c1, c2) und der öffentliche Wahlschlüssel als G₂ (96 Byte) · alle vor der Prüfung auf Untergruppen-Mitgliedschaft kontrolliert.",

  // VerifyAggregatePanel
  "Aggregate verification guide": "Anleitung zur Aggregat-Prüfung",
  "Reproduce the homomorphic sum": "Die homomorphe Summe reproduzieren",
  "{{n}} candidate ciphertexts": "{{n}} Kandidat:innen-Chiffretexte",
  "Confirm that the on-chain aggregate is exactly the homomorphic sum of every accepted ballot · no ballot added twice, none omitted.":
    "Bestätigen Sie, dass das On-Chain-Aggregat exakt die homomorphe Summe aller angenommenen Stimmen ist · keine doppelt addiert, keine ausgelassen.",
  "Download the aggregate fixture": "Aggregat-Fixture herunterladen",
  "Contains every accepted ballot's ciphertext points and the published on-chain aggregate. All ballots are fetched from the chain · may take a moment.":
    "Enthält die Chiffretextpunkte jeder angenommenen Stimme und das veröffentlichte On-Chain-Aggregat. Alle Stimmen werden von der Chain geladen · kann einen Moment dauern.",
  "Fetching all ballots…": "Alle Stimmen werden geladen…",
  "Exit code 0 = aggregate matches. Exit code 1 = mismatch detected.":
    "Exit-Code 0 = Aggregat stimmt überein. Exit-Code 1 = Abweichung erkannt.",
  "Homomorphic sum": "Homomorphe Summe",
  "Each ballot ciphertext (c1, c2) is a BLS12-381 G2 point. Point-adding all per-candidate c1s gives the aggregate c1; same for c2. The result must equal the on-chain aggregate byte-for-byte.":
    "Jeder Stimm-Chiffretext (c1, c2) ist ein BLS12-381 G2-Punkt. Die Punkt-Addition aller c1 pro Kandidat:in ergibt das Aggregat-c1, analog für c2. Das Ergebnis muss Byte für Byte mit dem On-Chain-Aggregat übereinstimmen.",
  "Only accepted ballots counted": "Nur angenommene Stimmen gezählt",
  "The fixture includes only ballots whose ZK proofs passed on-chain. Any ballot rejected at submission is excluded from the sum.":
    "Die Fixture enthält nur Stimmen, deren ZK-Beweise On-Chain bestanden haben. Bei der Abgabe abgelehnte Stimmen sind von der Summe ausgeschlossen.",

  // VerifySharesPanel
  "Decryption shares verification guide": "Anleitung zur Prüfung der Decryption Shares",
  "RE-VERIFY DECRYPTION SHARES LOCALLY": "ENTSCHLÜSSELUNGSANTEILE LOKAL ERNEUT PRÜFEN",
  "1 keyper · {{n}} candidates each": "1 Keyper · jeweils {{n}} Kandidat:innen",
  "{{count}} keypers · {{n}} candidates each":
    "{{count}} Keyper · jeweils {{n}} Kandidat:innen",
  "Confirm that each keyper's decryption share is cryptographically bound to their committee public key. A DLEQ proof is published alongside every share · verify it yourself to rule out fabricated or corrupted shares.":
    "Bestätigen Sie, dass jeder Decryption Share eines Keypers kryptographisch an den öffentlichen Komitee-Schlüssel gebunden ist. Zu jedem Anteil wird ein DLEQ-Beweis veröffentlicht · prüfen Sie ihn selbst, um manipulierte oder fehlerhafte Anteile auszuschließen.",
  "Download the shares fixture": "Anteils-Fixture herunterladen",
  "Contains the on-chain aggregate, all keyper decryption shares with their DLEQ proofs, and the committee public keys.":
    "Enthält das On-Chain-Aggregat, alle Decryption Shares mit ihren DLEQ-Beweisen sowie die öffentlichen Komitee-Schlüssel.",
  "Exit code 0 = all shares valid. Exit code 1 = at least one share failed.":
    "Exit-Code 0 = alle Anteile gültig. Exit-Code 1 = mindestens ein Anteil fehlerhaft.",
  "DLEQ proof per share": "DLEQ-Beweis pro Anteil",
  "Each share σ_i = s_i · C₁ (on the aggregate ciphertext) is accompanied by a discrete-log equality proof showing the same secret s_i produced σ_i and the keyper's committee public key (G₂). This prevents a corrupted or fabricated share from passing undetected.":
    "Jeder Anteil σ_i = s_i · C₁ (auf dem Aggregat-Chiffretext) wird von einem Gleichheitsbeweis des diskreten Logarithmus begleitet, der zeigt, dass dasselbe Geheimnis s_i sowohl σ_i als auch den öffentlichen Komitee-Schlüssel (G₂) des Keypers erzeugt hat. Damit kann kein manipulierter oder gefälschter Anteil unbemerkt durchgehen.",
  "Per-keyper, per-candidate": "Pro Keyper, pro Kandidat:in",
  "Every keyper must submit one valid share per candidate ciphertext. All shares are checked independently · a single bad share is flagged.":
    "Jeder Keyper muss einen gültigen Anteil pro Kandidat:innen-Chiffretext einreichen. Alle Anteile werden unabhängig geprüft · ein einzelner fehlerhafter Anteil wird markiert.",

  // VerifyResultPanel
  "Final tally verification guide": "Anleitung zur Prüfung des Endergebnisses",
  "RE-VERIFY THE FINAL TALLY LOCALLY": "ENDERGEBNIS LOKAL ERNEUT PRÜFEN",
  "{{n}} candidates · {{votes}} total votes": "{{n}} Kandidat:innen · {{votes}} Stimmen insgesamt",
  "Independently decrypt the aggregate using the keyper shares and reproduce the published vote counts yourself. If your numbers match, the tally is genuine · no trust in the dashboard required.":
    "Entschlüsseln Sie das Aggregat unabhängig mit den Keyper-Anteilen und reproduzieren Sie die veröffentlichten Stimmzahlen selbst. Stimmen Ihre Zahlen überein, ist die Auszählung echt · kein Vertrauen in das Dashboard nötig.",
  "Download the result fixture": "Ergebnis-Fixture herunterladen",
  "Contains the aggregate ciphertexts, all keyper decryption shares, committee public keys, election parameters, and the published tally to compare against.":
    "Enthält die Aggregat-Chiffretexte, alle Keyper Decryption Shares, die öffentlichen Komitee-Schlüssel, die Wahlparameter und die veröffentlichte Auszählung zum Vergleich.",
  "Exit code 0 = tally reproduced and matches. Exit code 1 = mismatch or insufficient shares.":
    "Exit-Code 0 = Auszählung reproduziert und übereinstimmend. Exit-Code 1 = Abweichung oder zu wenige Anteile.",
  "Share validity (DLEQ)": "Anteils-Gültigkeit (DLEQ)",
  "Each share is verified against its keyper's committee public key before use. Only shares passing the DLEQ proof are Lagrange-combined.":
    "Jeder Anteil wird vor der Verwendung gegen den öffentlichen Komitee-Schlüssel seines Keypers geprüft. Nur Anteile, die den DLEQ-Beweis bestehen, werden per Lagrange kombiniert.",
  "The first t verified shares are Lagrange-combined to remove the encryption mask from each candidate's aggregate ciphertext, without ever assembling the full private key.":
    "Die ersten t geprüften Anteile werden per Lagrange kombiniert, um die Verschlüsselungsmaske vom Aggregat-Chiffretext jeder/jedes Kandidat:in zu entfernen · ohne den vollständigen privaten Schlüssel jemals zusammenzusetzen.",
  "After decryption, a discrete-log solver recovers the integer vote count from a G₂ point. The search space is bounded by totalBallots × budget.":
    "Nach der Entschlüsselung gewinnt ein Diskreter-Logarithmus-Solver die Stimmzahl als Ganzzahl aus einem G₂-Punkt zurück. Der Suchraum ist durch totalBallots × budget begrenzt.",

  // Top-bar global search
  "Search ballots…": "Stimmen suchen…",

  // Easy mode trust cards
  "Fully public": "Vollständig öffentlich",
  "Every step on record": "Jeder Schritt dokumentiert",
  "Fully private": "Vollständig privat",
  "Your vote stays sealed": "Ihre Stimme bleibt versiegelt",

  // Easy mode stage cards (DKG, Aggregate, Shares)
  "Election lock is ready": "Wahlschloss bereit",
  "Setting up the election lock…": "Wahlschloss wird eingerichtet…",
  "Guardians work together to create the election lock.": "Die Hüter arbeiten gemeinsam, um das Wahlschloss zu erstellen.",
  "{{t}} of {{n}} guardians must work together to unlock the result — no single person can do it alone.":
    "{{t}} von {{n}} Hütern müssen gemeinsam arbeiten, um das Ergebnis zu entsperren — keine Einzelperson kann es allein.",
  "All votes bundled together": "Alle Stimmen gebündelt",
  "All votes were added up while still sealed — like stacking closed envelopes without opening any. The counts stay hidden until the guardians unlock them.":
    "Alle Stimmen wurden noch versiegelt addiert — wie das Stapeln geschlossener Umschläge. Die Zählungen bleiben verborgen, bis die Hüter sie entsperren.",
  "Candidate {{n}}": "Kandidat:in {{n}}",
  "sealed": "versiegelt",
  "needed": "benötigt",
  "Enough pieces collected! The final counts can now be revealed.":
    "Genügend Teile gesammelt! Die endgültigen Zählungen können nun enthüllt werden.",
  "{{remaining}} more pieces needed before the result can be opened.":
    "Noch {{remaining}} Teile benötigt, bevor das Ergebnis geöffnet werden kann.",

  // Easy mode journey status lines
  "Lock ready": "Schloss bereit",
  "Setting up…": "Wird eingerichtet…",
  "Voting open": "Abstimmung läuft",
  "Votes bundled": "Stimmen gebündelt",
  "Counting…": "Wird gezählt…",
  "{{count}} of {{total}} guardians": "{{count}} von {{total}} Hütern",
  "Decrypting…": "Wird entschlüsselt…",
  "Results revealed": "Ergebnis veröffentlicht",
  "Revealing…": "Wird enthüllt…",
  "Not started": "Noch nicht gestartet",
  "{{n}} votes received": "{{n}} Stimmen eingegangen",

  // Find my vote modal
  "Find my vote": "Meine Stimme suchen",
  "Voted? Find my vote →": "Abgestimmt? Meine Stimme suchen →",
  "After voting, you received a pseudonym — a unique code starting with 0x. Paste it below to confirm your vote was recorded.":
    "Nach der Stimmabgabe haben Sie ein Pseudonym erhalten — einen eindeutigen Code, der mit 0x beginnt. Fügen Sie ihn unten ein, um zu bestätigen, dass Ihre Stimme gezählt wurde.",
  "Paste your pseudonym (0x…)": "Pseudonym einfügen (0x…)",
  "No ballot found with that pseudonym.": "Kein Stimmzettel mit diesem Pseudonym gefunden.",
};
