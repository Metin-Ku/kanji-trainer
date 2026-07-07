export const en = {
  common: {
    cancel: "Cancel",
    select: "Select",
    delete: "Delete",
    sort: "Sort",
    sortWithCount: "Sort ({count})",
    loading: "…",
    wordCount: "{count} words",
    resultCount: "{count} results",
    noResultsForQuery: 'No results for "{query}"',
    selectAll: "Select all",
    selectedCount: "{count} selected",
    selectRows: "Select rows",
    goBack: "Go back",
    close: "Close",
    add: "Add",
    update: "Update",
    preview: "Preview",
    all: "All",
    continue: "Continue",
    check: "Check",
    completed: "Completed!",
    word: "Word",
    pronunciation: "Pronunciation",
    meaning: "Meaning",
    description: "Description",
    level: "Level",
    date: "Date",
    jlpt: "JLPT",
    clustering: "Clustering",
    noPronunciation: "No pronunciation",
    noMeaning: "No meaning",
    noDescription: "No description",
    emDash: "—",
    relatedWordsButton: "A ≡ B",
    relatedWordsNotFound: "No related words found",
    manualLinkBadge: "≡",
    cardProgress: "{current} / {total}",
    exampleProgress: "Example {current} / {total}",
    linkCount: "{count} link",
    srsBadge: "{count} SRS",
    confirmDeleteWord: "Are you sure you want to delete this word?",
    confirmBulkDelete: "Are you sure you want to delete {count} words?",
    confirmDeleteExample: "Do you want to delete this example?",
    language: "Language",
    english: "English",
    turkish: "Turkish",
  },

  nav: {
    srs: "SRS",
    settings: "Settings",
    progress: "Progress",
    words: "Words",
    pronunciation: "Pronunciation",
    meaning: "Meaning",
    learned: "Learned",
    learnedPronunciation: "Learned · Pronunciation",
    learnedMeaning: "Learned · Meaning",
  },

  home: {
    appSubtitle: "Japanese Word Notebook",
    searchPlaceholder: "Search word, reading, or meaning…",
    confirmDelete: 'Delete "{kanji}"?',
    studySection: "Study",
    tiles: {
      wordsTitle: "Words",
      pronunciationTitle: "Pronunciation",
      meaningTitle: "Meaning",
      learnedTitle: "Learned",
    },
  },

  dailyGoal: {
    title: "Daily goal",
    progress: "{count} / {target}",
    remaining: "{count} left today",
    complete: "Goal complete!",
    streak: "{days}-day streak",
    streakNone: "Start your streak",
    settingsTarget: "Daily word target",
    settingsTargetDeck: "Daily target for {deck}",
    settingsHint:
      "SRS (word/pronunciation/meaning): counts when the next interval is at least 1 day. Example deck: correct answers only. Flashcards: swipe right or save level.",
    byDeck: "By deck",
    noDeckTargets: "Set a target above 0 for at least one deck.",
    off: "Off",
    decks: {
      flashcard: "Flashcards",
    },
  },

  words: {
    title: "Words",
    loadError: "Failed to load words.",
    empty: "No words added yet",
    sort: {
      levelAsc: "Level ↑",
      levelDesc: "Level ↓",
      dateAsc: "Date: Oldest → Newest",
      dateDesc: "Date: Newest → Oldest",
      jlptAsc: "N5 → N1 (Easy → Hard)",
      jlptDesc: "N1 → N5 (Hard → Easy)",
      kanjiCluster: "Shared Kanji Clustering",
      multiCriteria: "{count} criteria applied (first selected first)",
    },
    studyTitle: "Words",
  },

  learned: {
    hubTitle: "Learned",
    wordsTitle: "Words",
    pronunciationTitle: "Pronunciation",
    meaningTitle: "Meaning",
    pageTitle: "Learned",
    empty: "No learned words yet.",
    emptyHint: "Press ★ at level 5 to add them.",
    studyWordsTitle: "Learned",
    studyPronunciationTitle: "Learned · Pronunciation",
    studyMeaningTitle: "Learned · Meaning",
    sort: {
      jlptAsc: "N5 → N1 (Easy → Hard)",
      jlptDesc: "N1 → N5 (Hard → Easy)",
      dateAsc: "Date: Oldest → Newest",
      dateDesc: "Date: Newest → Oldest",
      kanjiCluster: "Shared Kanji Clustering",
      levelAsc: "Level ↑",
      levelDesc: "Level ↓",
    },
  },

  study: {
    notFound: "Word not found",
    finishedCount: "You finished {count} words",
    shuffleAgain: "Shuffle again",
    backToList: "Back to list",
    detailLabels: {
      word: "Word",
      pronunciation: "Pronunciation",
      meaning: "Meaning",
      description: "Description",
    },
  },

  srs: {
    hub: {
      title: "Spaced Repetition",
      subtitle: "FSRS algorithm — same logic as Anki",
      filters: "Filters",
      jlptMin: "JLPT min",
      jlptMax: "JLPT max",
      sortLabel: "Sort",
      sessionTitlePrefix: "SRS · {label}",
      cardsReady: "{count} cards ready",
      noCardsToday: "No cards today",
      totalCards: " · {count} total",
      noCardsWithFilters: "No cards to study with these filters.",
      troubleWordsTile: "Trouble words",
      troubleWordsCount: "{count} words",
    },
    decks: {
      word: { title: "Word", subtitle: "Word" },
      pronunciation: { title: "Pronunciation", subtitle: "Pronunciation" },
      meaning: { title: "Meaning", subtitle: "Meaning" },
      example: { title: "Example", subtitle: "Example sentences" },
    },
    sort: {
      dueAsc: "Review date",
      dateDesc: "Added: Newest → Oldest",
      dateAsc: "Added: Oldest → Newest",
    },
    study: {
      cardNotFound: "Card not found",
      sessionComplete: "You finished the cards in this session",
      examplesComplete: "You finished the examples in this session",
      restart: "Start again",
      backToDecks: "Back to decks",
      saveFailed: "Could not save card. Please try again.",
      ratings: {
        again: "Again",
        hard: "Hard",
        good: "Good",
        easy: "Easy",
      },
    },
    example: {
      noExample: "No SRS example for this word.",
      answerPlaceholder: "Answer",
    },
    editor: {
      emptyHint:
        "Add sentences to show during SRS study. No HTML required.",
      addExample: "Add example",
      importFromDescription: "Import from existing description",
      exampleSentences: "Example sentences",
      linkAll: "Link all",
      add: "Add",
      exampleN: "Example {n}",
      japaneseSentence: "Japanese sentence",
      hideSelection: "Hide selected text",
      selectHeadword: "Select headword ({headword})",
      linkWords: "Link words",
      srsPreview: "SRS preview",
      hintLines: "Hint lines",
      highlightSelection: "Highlight selected text",
      addLine: "+ Add line",
      linkFailed:
        "Word linking failed. Kuromoji dictionary could not be loaded.",
      placeholders: {
        sentence: "喉が渇きました",
        hint: "Nodo ga kawakimashita",
      },
    },
  },

  wordForm: {
    editTitle: "Edit word",
    addTitle: "Add new word",
    tabs: {
      general: "General",
      srsExamples: "SRS Examples",
    },
    labels: {
      kanji: "Japanese word",
      pronunciation: "Pronunciation",
      meaning: "Meaning",
      examplesAndNotes: "Example sentences & notes",
      relatedWords: "Related words",
      relatedWordsHint: "(A ≡ B)",
      jlptLevel: "JLPT level",
      jlptOptional: "(optional)",
      date: "Date",
      level: "Level",
    },
    actions: {
      generateFromSrs: "Generate from SRS examples",
      submitAdd: "Add",
      submitUpdate: "Update",
    },
    confirmRegenerateDescription:
      "Regenerate the current description from SRS examples?",
    placeholders: {
      kanji: "例: 工事",
      pronunciation: "こうじ (kouji)",
      meaning: "TR: Construction | EN: Construction",
      description:
        "工事中です。\n--> Kouji-chuu desu.\n--> Construction work in progress.",
    },
  },

  bulkImport: {
    title: "Bulk add words",
    instructions:
      "Paste an HTML table. Parsed by .word, .pronunciation, .meaning, .description, and .jlpt classes.",
    placeholder: "<table>...</table>",
    pasteTable: "Paste a table",
    wordsDetected: "{count} words detected",
    addWords: "Add {count} words",
    linking: "Linking…",
    adding: "Adding…",
    importFailed: "Word linking or import failed.",
    linkingSkipped:
      "Word linking was skipped; words were still imported. You can relink examples from Settings.",
    result: {
      totalGiven: "{count} words submitted",
      added: "✓ {count} new words added",
      updated: "{count} words already existed; fields updated:",
    },
    descriptionTitle: "Description",
  },

  settings: {
    title: "Settings",
    sections: "Sections",
    styling: {
      nav: "Styling",
      title: "Styling",
      description:
        "Choose the main theme color. Level colors, star, and accents update accordingly.",
      selected: "Selected",
    },
    srs: {
      nav: "SRS",
      title: "SRS",
      description: "Example sentence deck and typing experience settings.",
      wordLinks: {
        label: "Known words in sentences",
        description:
          "Words in the database appear underlined in sentences; tap to open the info panel.",
      },
      romajiInput: {
        label: "Romaji → kana conversion",
        description:
          "Automatically convert Latin input to hiragana/katakana (ya → や, arubaito → アルバイト).",
      },
      dailyGoal: {
        label: "Daily goals by deck",
        description:
          "Set a separate daily target for each SRS deck and flashcards. The home widget shows the total.",
      },
    },
    database: {
      nav: "Database",
      title: "Database",
      description: "Backup and re-link SRS sentences across all words.",
      backup: {
        title: "Download backup",
        description:
          "Download words, relations, and SRS card progress as a JSON file.",
        button: "Download backup",
        success: "Backup file downloaded.",
        failed: "Backup failed.",
      },
      relink: {
        title: "Link all SRS sentences",
        description:
          "Re-scans example sentences for every word in the database. Newly added words (e.g. 勉強) are found in existing sentences; links and furigana are updated.",
        button: "Bulk word linking",
        progress: "{done} / {total} words…",
        noWords: "No words with SRS examples.",
        confirm:
          "SRS sentences for {count} words will be re-linked. Newly added words are included. Continue?",
        success: "SRS sentences updated for {count} words.",
        failed:
          "Bulk linking failed. Make sure the Kuromoji dictionary is loaded.",
      },
    },
    language: {
      nav: "Language",
      title: "Language",
      description: "Choose the interface language.",
    },
  },

  dates: {
    monthsFull: [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ],
    monthsShort: [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ],
    daysFull: [
      "Sunday", "Monday", "Tuesday", "Wednesday",
      "Thursday", "Friday", "Saturday",
    ],
    todayFormat: "{day}, {date} {month} {year}",
    cardDateFormat: "{day} {month} {year}",
    studyDateFormat: "{day} {monthShort} {year}",
  },

  a11y: {
    srs: "SRS",
    settings: "Settings",
    progress: "Progress",
    changeLevel: "Change level",
    markLearned: "Mark as learned",
    unmarkLearned: "Remove from learned",
    starAtLevel5: "Star available at level 5",
    learningLevel: "Learning level",
    edit: "Edit",
    remove: "Remove",
    relatedWords: "Related words",
    replayAnimation: "Replay",
    searchWords: "Search words…",
    strokeOrder: "Stroke order",
  },

  kanjiStroke: {
    title: "筆順 · Stroke order",
    loading: "Loading…",
    svgNotFound: "SVG not found",
  },

  levelChart: {
    title: "Learning level",
    starAtLevel5Hint: "Star can be assigned at level 5",
  },

  search: {
    relatedNotFound: 'No match for "{query}"',
  },

  troubleWords: {
    title: "Trouble words",
    subtitle: "Built automatically from SRS Again and example wrong answers",
    filterAll: "All",
    empty: "No trouble words yet — they appear after Again or a wrong example answer.",
    study: "Study",
    dismiss: "Remove from pool",
    lastMistake: "Last mistake: {when}",
    today: "today",
    yesterday: "yesterday",
    daysAgo: "{count} days ago",
    pickDeck: "Which deck to study?",
    deckWordCount: "{count} words",
    sessionTitle: "Trouble words · {label}",
    noCardsForDeck: "No cards to study for this deck.",
    loadFailed: "Could not load the list.",
  },

  progress: {
    title: "Progress",
    subtitle: "Study activity, levels, and JLPT coverage",
    sections: {
      heatmap: "Study calendar",
      deckActivity: "Deck activity",
      levelDistribution: "Level distribution",
      jlpt: "JLPT completion",
    },
    heatmap: {
      tooltip: "{date} · {count} words studied",
      less: "Less",
      more: "More",
    },
    miniHeatmap: {
      title: "Last 7 days",
    },
    deckChart: {
      weekTotal: "{count} this week",
      empty: "No study activity recorded yet.",
    },
    levelMode: {
      word: "Word",
      pron: "Pronunciation",
      meaning: "Meaning",
    },
    jlpt: {
      untagged: "Untagged",
      noWords: "No words",
      count: "{learned} / {total} learned",
    },
  },
} as const;

export type { Messages } from "./messages";
