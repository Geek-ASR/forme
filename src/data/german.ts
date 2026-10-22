// German content: words of the day, grammar cheat sheets and a phrasebook for life in Germany.

export type WordOfDay = { de: string; art?: 'der' | 'die' | 'das'; en: string; ex: [string, string] }

export const WORDS_OF_DAY: WordOfDay[] = [
  { art: 'die', de: 'Gelassenheit', en: 'composure, calm serenity', ex: ['Mit Gelassenheit geht alles leichter.', 'Everything is easier with composure.'] },
  { art: 'das', de: 'Durchhaltevermögen', en: 'staying power, perseverance', ex: ['Abnehmen braucht vor allem Durchhaltevermögen.', 'Losing weight takes perseverance above all.'] },
  { art: 'der', de: 'innere Schweinehund', en: 'the inner couch potato (lazy voice)', ex: ['Heute habe ich meinen inneren Schweinehund besiegt.', 'Today I beat my inner couch potato.'] },
  { art: 'der', de: 'Muskelkater', en: 'muscle soreness (lit. "muscle tomcat")', ex: ['Nach dem Training hatte ich zwei Tage Muskelkater.', 'After training I was sore for two days.'] },
  { art: 'die', de: 'Selbstfürsorge', en: 'self-care', ex: ['Selbstfürsorge ist kein Luxus.', 'Self-care is not a luxury.'] },
  { art: 'die', de: 'Achtsamkeit', en: 'mindfulness', ex: ['Ich übe jeden Morgen zehn Minuten Achtsamkeit.', 'I practise ten minutes of mindfulness every morning.'] },
  { art: 'das', de: 'Fernweh', en: 'longing for faraway places', ex: ['Im Winter habe ich immer Fernweh.', 'In winter I always long to travel.'] },
  { art: 'die', de: 'Vorfreude', en: 'joyful anticipation', ex: ['Vorfreude ist die schönste Freude.', 'Anticipation is the sweetest joy.'] },
  { art: 'der', de: 'Feierabend', en: 'end of the working day, time off', ex: ['Endlich Feierabend!', 'Finally done for the day!'] },
  { art: 'die', de: 'Gemütlichkeit', en: 'cosiness, warm comfort', ex: ['Ich liebe die Gemütlichkeit eines Winterabends.', 'I love the cosiness of a winter evening.'] },
  { art: 'das', de: 'Kopfkino', en: 'a movie playing in your head', ex: ['Bei dem Gedanken startet sofort mein Kopfkino.', 'The thought instantly starts a movie in my head.'] },
  { art: 'der', de: 'Ohrwurm', en: 'earworm, a catchy song stuck in your head', ex: ['Dieses Lied ist ein echter Ohrwurm.', 'This song is a real earworm.'] },
  { art: 'die', de: 'Sehnsucht', en: 'deep longing, yearning', ex: ['Er hat Sehnsucht nach seiner Familie.', 'He longs for his family.'] },
  { art: 'der', de: 'Weltschmerz', en: 'world-weariness', ex: ['Manchmal überkommt mich ein leichter Weltschmerz.', 'Sometimes a slight world-weariness comes over me.'] },
  { art: 'die', de: 'Torschlusspanik', en: 'fear that time is running out', ex: ['Mit dreißig bekam sie Torschlusspanik.', 'At thirty she panicked that time was running out.'] },
  { art: 'das', de: 'Fingerspitzengefühl', en: 'tact, intuitive sensitivity', ex: ['Diese Aufgabe verlangt viel Fingerspitzengefühl.', 'This task needs a lot of tact.'] },
  { art: 'die', de: 'Schnapsidee', en: 'a crazy idea', ex: ['Das war eine echte Schnapsidee.', 'That was a truly crazy idea.'] },
  { art: 'der', de: 'Zeitgeist', en: 'spirit of the times', ex: ['Das Buch trifft den Zeitgeist.', 'The book captures the spirit of the times.'] },
  { art: 'die', de: 'Waldeinsamkeit', en: 'the peace of being alone in the woods', ex: ['Auf dem Wanderweg genoss ich die Waldeinsamkeit.', 'On the trail I enjoyed the solitude of the forest.'] },
  { art: 'das', de: 'Lampenfieber', en: 'stage fright', ex: ['Vor der Präsentation hatte ich Lampenfieber.', 'I had stage fright before the presentation.'] },
  { art: 'der', de: 'Morgenmuffel', en: 'someone grumpy in the morning', ex: ['Ich bin ein echter Morgenmuffel.', "I'm really not a morning person."] },
  { art: 'das', de: 'Sitzfleisch', en: 'the patience to sit and work for hours', ex: ['Zum Lernen braucht man Sitzfleisch.', 'Studying takes staying power.'] },
  { de: 'verschlimmbessern', en: 'to make worse by trying to improve', ex: ['Ich habe den Text nur verschlimmbessert.', 'I only made the text worse by "improving" it.'] },
  { art: 'der', de: 'Treppenwitz', en: 'the perfect reply you think of too late', ex: ['Die perfekte Antwort fiel mir erst auf der Treppe ein.', 'The perfect answer only came to me on the stairs.'] },
  { art: 'das', de: 'Gleichgewicht', en: 'balance, equilibrium', ex: ['Ich suche das Gleichgewicht zwischen Arbeit und Ruhe.', "I'm looking for the balance between work and rest."] },
  { art: 'der', de: 'Kreislauf', en: 'cycle; circulation', ex: ['Alles ist Teil eines großen Kreislaufs.', 'Everything is part of a great cycle.'] },
  { art: 'die', de: 'Sternwarte', en: 'observatory', ex: ['Von der Sternwarte aus sieht man die Milchstraße.', 'From the observatory you can see the Milky Way.'] },
  { art: 'die', de: 'Erkenntnis', en: 'insight, realisation', ex: ['Das war eine wichtige Erkenntnis für mich.', 'That was an important insight for me.'] },
  { art: 'die', de: 'Gewissheit', en: 'certainty', ex: ['Geerbte Gewissheit ist noch kein Verständnis.', 'Inherited certainty is not yet understanding.'] },
  { art: 'das', de: 'Bewusstsein', en: 'consciousness, awareness', ex: ['Das Bewusstsein ist eines der größten Rätsel.', 'Consciousness is one of the greatest mysteries.'] },
  { art: 'das', de: 'Schicksal', en: 'fate, destiny', ex: ['Ich glaube nicht an Schicksal, sondern an Entscheidungen.', "I don't believe in fate, but in decisions."] },
  { art: 'die', de: 'Vergänglichkeit', en: 'impermanence, transience', ex: ['Die Vergänglichkeit macht das Leben kostbar.', 'Impermanence makes life precious.'] },
  { art: 'die', de: 'Freiheit', en: 'freedom', ex: ['Freiheit bedeutet auch Verantwortung.', 'Freedom also means responsibility.'] },
  { art: 'die', de: 'Weltanschauung', en: 'worldview, philosophy of life', ex: ['Jeder Mensch hat seine eigene Weltanschauung.', 'Every person has their own worldview.'] },
  { art: 'das', de: 'Gedankenexperiment', en: 'thought experiment', ex: ['Lass uns ein Gedankenexperiment machen.', "Let's do a thought experiment."] },
  { art: 'die', de: 'Neugier', en: 'curiosity', ex: ['Neugier ist der Anfang jeder Wissenschaft.', 'Curiosity is the beginning of all science.'] },
  { art: 'die', de: 'Geduld', en: 'patience', ex: ['Mit Geduld erreicht man fast alles.', 'With patience you can achieve almost anything.'] },
  { art: 'der', de: 'Ehrgeiz', en: 'ambition', ex: ['Ihr Ehrgeiz treibt sie jeden Tag an.', 'Her ambition drives her every day.'] },
  { art: 'die', de: 'Ausdauer', en: 'endurance, stamina', ex: ['Spazierengehen verbessert die Ausdauer.', 'Walking improves endurance.'] },
  { art: 'die', de: 'Gewohnheit', en: 'habit', ex: ['Gute Gewohnheiten entstehen in kleinen Schritten.', 'Good habits form in small steps.'] },
  { art: 'der', de: 'Fortschritt', en: 'progress', ex: ['Jeder kleine Fortschritt zählt.', 'Every bit of progress counts.'] },
  { art: 'die', de: 'Dankbarkeit', en: 'gratitude', ex: ['Dankbarkeit macht glücklich.', 'Gratitude makes you happy.'] },
  { art: 'die', de: 'Hoffnung', en: 'hope', ex: ['Die Hoffnung stirbt zuletzt.', 'Hope dies last.'] },
  { art: 'der', de: 'Mut', en: 'courage', ex: ['Es braucht Mut, neu anzufangen.', 'It takes courage to start over.'] },
  { art: 'die', de: 'Geborgenheit', en: 'the feeling of being safe and sheltered', ex: ['Zu Hause spüre ich Geborgenheit.', 'At home I feel safe and sheltered.'] },
  { art: 'die', de: 'Wohngemeinschaft', en: 'shared flat (WG)', ex: ['Ich suche ein Zimmer in einer WG.', "I'm looking for a room in a shared flat."] },
  { art: 'die', de: 'Anmeldung', en: 'registration (of your address)', ex: ['Die Anmeldung muss innerhalb von zwei Wochen erfolgen.', 'Registration must happen within two weeks.'] },
  { art: 'die', de: 'Vorlesung', en: 'lecture', ex: ['Die Vorlesung beginnt um neun Uhr.', 'The lecture starts at nine.'] },
  { art: 'die', de: 'Prüfung', en: 'exam', ex: ['Ich bereite mich auf die Prüfung vor.', "I'm preparing for the exam."] },
  { art: 'das', de: 'Stipendium', en: 'scholarship', ex: ['Sie hat ein Stipendium bekommen.', 'She got a scholarship.'] },
  { art: 'der', de: 'Schlaf', en: 'sleep', ex: ['Guter Schlaf ist die beste Medizin.', 'Good sleep is the best medicine.'] },
  { art: 'die', de: 'Sonnencreme', en: 'sunscreen', ex: ['Vergiss die Sonnencreme nicht!', "Don't forget the sunscreen!"] },
  { art: 'die', de: 'Lebensfreude', en: 'joy of living', ex: ['Sie strahlt Lebensfreude aus.', 'She radiates joy of life.'] },
  { art: 'das', de: 'Heimweh', en: 'homesickness', ex: ['In der ersten Woche hatte ich Heimweh.', 'I was homesick in the first week.'] },
  { art: 'die', de: 'Zuversicht', en: 'confident optimism', ex: ['Ich blicke mit Zuversicht in die Zukunft.', 'I look to the future with confidence.'] },
  { art: 'der', de: 'Augenblick', en: 'moment (lit. "blink of an eye")', ex: ['Genieße den Augenblick.', 'Enjoy the moment.'] },
  { art: 'die', de: 'Gänsehaut', en: 'goosebumps', ex: ['Bei dieser Musik bekomme ich Gänsehaut.', 'This music gives me goosebumps.'] },
  { de: 'sturmfrei', en: 'having the place to yourself', ex: ['Heute habe ich sturmfrei.', 'I have the place to myself today.'] },
  { art: 'der', de: 'Kummerspeck', en: 'weight gained from emotional eating', ex: ['Kummerspeck ist kein Schicksal.', 'Comfort-eating weight is not destiny.'] },
  { art: 'das', de: 'Luftschloss', en: 'castle in the air, a daydream', ex: ['Das ist kein Luftschloss, sondern ein Plan.', "That's not a castle in the air, it's a plan."] },
  { art: 'die', de: 'Ruhe', en: 'calm, quiet', ex: ['In der Ruhe liegt die Kraft.', 'Strength lies in calm.'] },
  { art: 'die', de: 'Weisheit', en: 'wisdom', ex: ['Weisheit kommt mit Erfahrung.', 'Wisdom comes with experience.'] },
]

export function wordOfDay(dateKey: string): WordOfDay {
  let h = 7
  for (const ch of dateKey) h = (h * 33 + ch.charCodeAt(0)) >>> 0
  return WORDS_OF_DAY[h % WORDS_OF_DAY.length]
}

// ── Grammar cheat sheets ──
export type Sheet = {
  id: string
  title: string
  level: string
  intro?: string
  tables?: { caption?: string; head: string[]; rows: string[][] }[]
  points?: string[]
  examples?: [string, string][]
}

export const SHEETS: Sheet[] = [
  {
    id: 'articles', title: 'Articles & the four cases', level: 'A1–A2',
    intro: 'Nominative = subject (who does it). Accusative = direct object (whom). Dative = indirect object (to whom), and after dative prepositions. Genitive = possession (whose).',
    tables: [
      { caption: 'Definite (the)', head: ['', 'Masc.', 'Fem.', 'Neut.', 'Plural'], rows: [['Nom', 'der', 'die', 'das', 'die'], ['Akk', 'den', 'die', 'das', 'die'], ['Dat', 'dem', 'der', 'dem', 'den (+n)'], ['Gen', 'des (+s)', 'der', 'des (+s)', 'der']] },
      { caption: 'Indefinite (a) — kein follows the same endings', head: ['', 'Masc.', 'Fem.', 'Neut.', 'Plural (kein)'], rows: [['Nom', 'ein', 'eine', 'ein', 'keine'], ['Akk', 'einen', 'eine', 'ein', 'keine'], ['Dat', 'einem', 'einer', 'einem', 'keinen'], ['Gen', 'eines', 'einer', 'eines', 'keiner']] },
    ],
    points: ['Only masculine changes in the accusative: der → den, ein → einen.', 'Dative plural nouns add -n if they can: mit den Kindern.'],
    examples: [['Der Mann gibt dem Kind einen Apfel.', 'The man gives the child an apple.'], ['Das ist das Buch des Lehrers.', "That is the teacher's book."]],
  },
  {
    id: 'pronouns', title: 'Personal pronouns', level: 'A1',
    tables: [
      { head: ['Nom', 'Akk', 'Dat'], rows: [['ich', 'mich', 'mir'], ['du', 'dich', 'dir'], ['er', 'ihn', 'ihm'], ['sie', 'sie', 'ihr'], ['es', 'es', 'ihm'], ['wir', 'uns', 'uns'], ['ihr', 'euch', 'euch'], ['sie / Sie', 'sie / Sie', 'ihnen / Ihnen']] },
    ],
    points: ['Possessives (mein, dein, sein, ihr, unser, euer, ihr, Ihr) take the same endings as ein/kein.', 'Sie (capital S) is the polite "you" — use it with professors, officials and strangers.'],
    examples: [['Kannst du mir helfen?', 'Can you help me?'], ['Ich sehe ihn morgen.', "I'll see him tomorrow."]],
  },
  {
    id: 'prepositions', title: 'Prepositions & their cases', level: 'A2',
    tables: [
      { head: ['Case', 'Prepositions'], rows: [
        ['Akkusativ', 'durch, für, gegen, ohne, um (bis, entlang)'],
        ['Dativ', 'aus, bei, mit, nach, seit, von, zu (gegenüber, ab)'],
        ['Wechsel (Akk = wohin? Dat = wo?)', 'an, auf, hinter, in, neben, über, unter, vor, zwischen'],
        ['Genitiv', 'wegen, trotz, während, (an)statt, innerhalb, außerhalb'],
      ] },
      { caption: 'Contractions', head: ['Short', 'Long'], rows: [['am', 'an dem'], ['im', 'in dem'], ['ins', 'in das'], ['zum', 'zu dem'], ['zur', 'zu der'], ['vom', 'von dem'], ['beim', 'bei dem']] },
    ],
    examples: [['Ich gehe in die Bibliothek. (wohin → Akk)', "I'm going into the library."], ['Ich lerne in der Bibliothek. (wo → Dat)', "I'm studying in the library."], ['Wegen des Regens bleibe ich zu Hause.', "Because of the rain I'm staying home."]],
  },
  {
    id: 'word-order', title: 'Word order', level: 'A1–B1',
    points: [
      'Main clause: the conjugated verb is always in position 2. "Heute lerne ich Deutsch."',
      'W-questions: W-word + verb + subject. "Was machst du?" Yes/no questions start with the verb. "Kommst du mit?"',
      'Subordinate clauses (weil, dass, wenn, ob, obwohl, als, damit, bevor, nachdem) send the verb to the end. "…, weil ich müde bin."',
      'Modal verb in position 2, infinitive at the end. "Ich muss heute arbeiten."',
      'Separable verbs split in main clauses. "Ich stehe um sieben Uhr auf." — but stay together at the end of a subordinate clause: "…, weil ich früh aufstehe."',
      'Middle field order — TeKaMoLo: Time, Cause, Manner, Place. "Ich fahre morgen wegen der Prüfung mit dem Zug nach Berlin."',
      'und, aber, oder, denn, sondern sit in "position 0" and do not change the word order.',
    ],
  },
  {
    id: 'present', title: 'Present tense & key verbs', level: 'A1',
    tables: [
      { head: ['', 'machen', 'sein', 'haben', 'werden'], rows: [['ich', 'mache', 'bin', 'habe', 'werde'], ['du', 'machst', 'bist', 'hast', 'wirst'], ['er/sie/es', 'macht', 'ist', 'hat', 'wird'], ['wir', 'machen', 'sind', 'haben', 'werden'], ['ihr', 'macht', 'seid', 'habt', 'werdet'], ['sie/Sie', 'machen', 'sind', 'haben', 'werden']] },
      { caption: 'Stem changes (du / er)', head: ['Verb', 'du', 'er/sie/es'], rows: [['fahren', 'fährst', 'fährt'], ['schlafen', 'schläfst', 'schläft'], ['laufen', 'läufst', 'läuft'], ['essen', 'isst', 'isst'], ['nehmen', 'nimmst', 'nimmt'], ['sprechen', 'sprichst', 'spricht'], ['helfen', 'hilfst', 'hilft'], ['lesen', 'liest', 'liest'], ['sehen', 'siehst', 'sieht'], ['geben', 'gibst', 'gibt']] },
    ],
  },
  {
    id: 'modals', title: 'Modal verbs', level: 'A1–A2',
    tables: [
      { head: ['', 'können', 'müssen', 'wollen', 'dürfen', 'sollen', 'möchten'], rows: [
        ['ich', 'kann', 'muss', 'will', 'darf', 'soll', 'möchte'],
        ['du', 'kannst', 'musst', 'willst', 'darfst', 'sollst', 'möchtest'],
        ['er/sie/es', 'kann', 'muss', 'will', 'darf', 'soll', 'möchte'],
        ['wir', 'können', 'müssen', 'wollen', 'dürfen', 'sollen', 'möchten'],
        ['ihr', 'könnt', 'müsst', 'wollt', 'dürft', 'sollt', 'möchtet'],
        ['sie/Sie', 'können', 'müssen', 'wollen', 'dürfen', 'sollen', 'möchten'],
      ] },
    ],
    points: ['ich and er/sie/es have the same form, with no ending.', 'nicht müssen = not have to; nicht dürfen = must not.'],
    examples: [['Du musst das nicht machen.', "You don't have to do that."], ['Hier darf man nicht rauchen.', 'You must not smoke here.']],
  },
  {
    id: 'perfekt', title: 'Perfekt (spoken past)', level: 'A2',
    points: [
      'haben/sein in position 2 + Partizip II at the end. "Ich habe gegessen."',
      'Use sein for movement from A to B (gehen, fahren, kommen, fliegen), change of state (aufstehen, einschlafen, werden, sterben), and sein, bleiben, passieren.',
      'Regular: ge- + stem + -t (gemacht, gelernt). Irregular: ge- + stem + -en (gegessen, geschrieben).',
      'No ge- for verbs ending in -ieren (studiert) or with be-, ver-, er-, ent-, emp-, zer-, miss- (besucht, verstanden).',
      'Separable verbs put ge- in the middle: aufgestanden, eingekauft.',
    ],
    tables: [
      { caption: 'Must-know participles', head: ['Infinitive', 'Perfekt'], rows: [['sein', 'ist gewesen'], ['gehen', 'ist gegangen'], ['fahren', 'ist gefahren'], ['kommen', 'ist gekommen'], ['bleiben', 'ist geblieben'], ['essen', 'hat gegessen'], ['trinken', 'hat getrunken'], ['schreiben', 'hat geschrieben'], ['lesen', 'hat gelesen'], ['sprechen', 'hat gesprochen'], ['nehmen', 'hat genommen'], ['finden', 'hat gefunden'], ['denken', 'hat gedacht'], ['wissen', 'hat gewusst']] },
    ],
  },
  {
    id: 'adjectives', title: 'Adjective endings', level: 'A2–B1',
    tables: [
      { caption: 'After der/die/das (weak)', head: ['', 'Masc.', 'Fem.', 'Neut.', 'Plural'], rows: [['Nom', '-e', '-e', '-e', '-en'], ['Akk', '-en', '-e', '-e', '-en'], ['Dat', '-en', '-en', '-en', '-en'], ['Gen', '-en', '-en', '-en', '-en']] },
      { caption: 'After ein/kein/mein (mixed)', head: ['', 'Masc.', 'Fem.', 'Neut.', 'Plural'], rows: [['Nom', '-er', '-e', '-es', '-en'], ['Akk', '-en', '-e', '-es', '-en'], ['Dat', '-en', '-en', '-en', '-en'], ['Gen', '-en', '-en', '-en', '-en']] },
      { caption: 'No article (strong)', head: ['', 'Masc.', 'Fem.', 'Neut.', 'Plural'], rows: [['Nom', '-er', '-e', '-es', '-e'], ['Akk', '-en', '-e', '-es', '-e'], ['Dat', '-em', '-er', '-em', '-en'], ['Gen', '-en', '-er', '-en', '-er']] },
    ],
    points: ['Shortcut: if the article already shows the gender/case, the adjective relaxes to -e/-en. If it does not, the adjective does the work.'],
    examples: [['der gute Kaffee · ein guter Kaffee · guter Kaffee', 'the / a / — good coffee']],
  },
  {
    id: 'connectors', title: 'Connectors', level: 'A2–B1',
    tables: [
      { head: ['Effect on the verb', 'Connectors'], rows: [
        ['Position 0 — no change', 'und, aber, oder, denn, sondern'],
        ['Position 1 — verb comes next', 'deshalb, deswegen, trotzdem, dann, außerdem, danach, sonst'],
        ['Subordinate — verb to the end', 'weil, dass, obwohl, wenn, als, ob, damit, während, bevor, nachdem, sodass, seitdem'],
      ] },
    ],
    examples: [['Ich bin müde, aber ich lerne noch.', "I'm tired, but I'm still studying."], ['Ich bin müde, deshalb gehe ich ins Bett.', "I'm tired, so I'm going to bed."], ['Ich gehe ins Bett, weil ich müde bin.', "I'm going to bed because I'm tired."]],
  },
  {
    id: 'gender', title: 'Guessing der, die or das', level: 'A1–B1',
    tables: [
      { head: ['Usually', 'Endings & groups'], rows: [
        ['die', '-ung, -heit, -keit, -schaft, -ion, -tät, -ie, -ik, -ur, -ei, -enz, -anz; most nouns in -e (die Lampe)'],
        ['der', '-er (people: der Lehrer), -ling, -ismus, -or, -ig, -ich; days, months, seasons, weather'],
        ['das', '-chen, -lein (small things), -ment, -um, -nis (mostly), Ge- collectives, verbs used as nouns (das Essen)'],
      ] },
    ],
    points: ['Compound nouns take the gender of the LAST word: die Haustür (das Haus + die Tür).', 'Learn every noun with its article and plural — it is the single best German habit.'],
  },
]

// ── Phrasebook ──
export const PHRASES: { group: string; items: [string, string][] }[] = [
  {
    group: 'Bürgeramt & paperwork',
    items: [
      ['Ich möchte meinen Wohnsitz anmelden.', "I'd like to register my address."],
      ['Ich habe einen Termin um zehn Uhr.', 'I have an appointment at ten.'],
      ['Welche Unterlagen brauche ich?', 'Which documents do I need?'],
      ['Hier ist die Wohnungsgeberbestätigung.', "Here is the landlord's confirmation."],
      ['Könnten Sie das bitte langsamer sagen?', 'Could you say that more slowly, please?'],
    ],
  },
  {
    group: 'Finding a room',
    items: [
      ['Ist das Zimmer noch frei?', 'Is the room still available?'],
      ['Wie hoch ist die Warmmiete?', 'What is the rent including utilities?'],
      ['Sind die Nebenkosten inklusive?', 'Are the additional costs included?'],
      ['Wann kann ich einziehen?', 'When can I move in?'],
      ['Ich würde das Zimmer gern besichtigen.', "I'd like to view the room."],
    ],
  },
  {
    group: 'University',
    items: [
      ['Wo ist das Studierendensekretariat?', "Where is the student registrar's office?"],
      ['Wann ist Ihre Sprechstunde?', 'When are your office hours?'],
      ['Ich habe eine Frage zur Prüfungsanmeldung.', 'I have a question about exam registration.'],
      ['Gibt es die Folien auch online?', 'Are the slides available online too?'],
      ['Darf ich mich der Lerngruppe anschließen?', 'May I join the study group?'],
    ],
  },
  {
    group: 'Doctor & pharmacy',
    items: [
      ['Ich hätte gern einen Termin.', "I'd like an appointment."],
      ['Ich habe starke Rückenschmerzen.', 'I have severe back pain.'],
      ['Ich habe eine chronische Erkrankung.', 'I have a chronic condition.'],
      ['Ich bin gesetzlich versichert.', 'I have public health insurance.'],
      ['Ich brauche ein Rezept für dieses Medikament.', 'I need a prescription for this medicine.'],
    ],
  },
  {
    group: 'Everyday',
    items: [
      ['Kann ich mit Karte zahlen?', 'Can I pay by card?'],
      ['Ich bin Vegetarier. Ist da Ei drin?', "I'm vegetarian. Is there egg in it?"],
      ['Ein Deutschlandticket, bitte.', 'A Deutschlandticket, please.'],
      ['Entschuldigung, wie komme ich zum Bahnhof?', 'Excuse me, how do I get to the station?'],
      ['Können wir Deutsch sprechen? Ich möchte üben.', "Can we speak German? I'd like to practise."],
    ],
  },
]

export const RESOURCES: { name: string; what: string; url: string }[] = [
  { name: 'DW — Nicos Weg', what: 'Free complete A1–B1 video course', url: 'https://learngerman.dw.com/en/nicos-weg/c-36519789' },
  { name: 'Easy German', what: 'Street interviews with subtitles (YouTube)', url: 'https://www.youtube.com/@EasyGerman' },
  { name: 'Goethe-Institut', what: 'Exam formats and free practice sets', url: 'https://www.goethe.de/en/spr/kup/prf.html' },
  { name: 'DW — Langsam gesprochene Nachrichten', what: 'Slowly spoken daily news', url: 'https://learngerman.dw.com/de/langsam-gesprochene-nachrichten/s-60040332' },
]
