import type { Messages } from "./messages";

export const tr: Messages = {
  common: {
    cancel: "İptal",
    select: "Seç",
    delete: "Sil",
    sort: "Sırala",
    sortWithCount: "Sırala ({count})",
    loading: "…",
    wordCount: "{count} kelime",
    resultCount: "{count} sonuç",
    noResultsForQuery: '"{query}" için sonuç bulunamadı',
    selectAll: "Tümünü seç",
    selectedCount: "{count} seçildi",
    selectRows: "Satır seçin",
    goBack: "Geri dön",
    close: "Kapat",
    add: "Ekle",
    update: "Güncelle",
    preview: "Önizleme",
    all: "Hepsi",
    continue: "Devam",
    check: "Kontrol",
    completed: "Tamamlandı!",
    word: "Kelime",
    pronunciation: "Okunuş",
    meaning: "Anlam",
    description: "Açıklama",
    level: "Seviye",
    date: "Tarih",
    jlpt: "JLPT",
    clustering: "Kümeleme",
    noPronunciation: "Okunuş yok",
    noMeaning: "Anlam yok",
    noDescription: "Açıklama yok",
    emDash: "—",
    relatedWordsButton: "A ≡ B",
    relatedWordsNotFound: "İlişkili kelime bulunamadı",
    manualLinkBadge: "≡",
    cardProgress: "{current} / {total}",
    exampleProgress: "Örnek {current} / {total}",
    linkCount: "{count} link",
    srsBadge: "{count} SRS",
    confirmDeleteWord: "Bu kelimeyi silmek istediğinize emin misiniz?",
    confirmBulkDelete: "{count} kelimeyi silmek istediğinize emin misiniz?",
    confirmDeleteExample: "Bu örneği silmek istiyor musunuz?",
    language: "Dil",
    english: "İngilizce",
    turkish: "Türkçe",
  },

  nav: {
    srs: "SRS",
    settings: "Ayarlar",
    progress: "İlerleme",
    words: "Kelimeler",
    pronunciation: "Okunuş",
    meaning: "Anlam",
    learned: "Öğrenilenler",
    learnedPronunciation: "Öğrenilenler · Okunuş",
    learnedMeaning: "Öğrenilenler · Anlam",
  },

  home: {
    appSubtitle: "Japonca Kelime Defteri",
    searchPlaceholder: "Kelime, okunuş veya anlam ara…",
    confirmDelete: '"{kanji}" silinsin mi?',
    studySection: "Çalışma",
    tiles: {
      wordsTitle: "Kelimeler",
      pronunciationTitle: "Okunuş",
      meaningTitle: "Anlam",
      learnedTitle: "Öğrenilenler",
    },
  },

  dailyGoal: {
    title: "Günlük hedef",
    progress: "{count} / {target}",
    remaining: "Bugün {count} kaldı",
    complete: "Hedef tamam!",
    streak: "{days} gün seri",
    streakNone: "Seriye başla",
    settingsTarget: "Günlük kelime hedefi",
    settingsTargetDeck: "{deck} günlük hedefi",
    settingsHint:
      "SRS (kelime/okunuş/anlam): yalnızca sonraki aralık en az 1 gün olduğunda sayılır. Örnek deste: doğru cevap. Flashcard: sağ kaydır veya seviye kaydı.",
    byDeck: "Deste bazında",
    noDeckTargets: "En az bir deste için 0'dan büyük hedef belirleyin.",
    off: "Kapalı",
    decks: {
      flashcard: "Flashcard",
    },
  },

  words: {
    title: "Kelimeler",
    loadError: "Kelimeler yüklenemedi.",
    empty: "Henüz kelime eklenmedi",
    sort: {
      levelAsc: "Seviye ↑",
      levelDesc: "Seviye ↓",
      dateAsc: "Tarih: Eski → Yeni",
      dateDesc: "Tarih: Yeni → Eski",
      jlptAsc: "N5 → N1 (Kolay → Zor)",
      jlptDesc: "N1 → N5 (Zor → Kolay)",
      kanjiCluster: "Ortak Kanji Kümeleme",
      multiCriteria: "{count} kriter uygulandı (ilk seçilen önce)",
    },
    studyTitle: "Kelimeler",
  },

  learned: {
    hubTitle: "Öğrenilenler",
    wordsTitle: "Kelimeler",
    pronunciationTitle: "Okunuş",
    meaningTitle: "Anlam",
    pageTitle: "Öğrenilenler",
    empty: "Henüz öğrenilen kelime yok.",
    emptyHint: "Seviye 5'te ★ ile ekleyin.",
    studyWordsTitle: "Öğrenilenler",
    studyPronunciationTitle: "Öğrenilenler · Okunuş",
    studyMeaningTitle: "Öğrenilenler · Anlam",
    sort: {
      jlptAsc: "N5 → N1 (Kolay → Zor)",
      jlptDesc: "N1 → N5 (Zor → Kolay)",
      dateAsc: "Tarih: Eski → Yeni",
      dateDesc: "Tarih: Yeni → Eski",
      kanjiCluster: "Ortak Kanji Kümeleme",
      levelAsc: "Seviye ↑",
      levelDesc: "Seviye ↓",
    },
  },

  study: {
    notFound: "Kelime bulunamadı",
    finishedCount: "{count} kelimeyi bitirdin",
    shuffleAgain: "Yeniden karıştır",
    backToList: "Listeye dön",
    detailLabels: {
      word: "Kelime",
      pronunciation: "Okunuş",
      meaning: "Anlam",
      description: "Açıklama",
    },
  },

  srs: {
    hub: {
      title: "Aralıklı Tekrar",
      subtitle: "FSRS algoritması — Anki ile aynı mantık",
      filters: "Filtreler",
      jlptMin: "JLPT min",
      jlptMax: "JLPT max",
      sortLabel: "Sırala",
      sessionTitlePrefix: "SRS · {label}",
      cardsReady: "{count} kart hazır",
      noCardsToday: "Bugün kart yok",
      totalCards: " · {count} toplam",
      noCardsWithFilters: "Bu filtrelerle çalışılacak kart yok.",
      troubleWordsTile: "Zor kelimeler",
      troubleWordsCount: "{count} kelime",
    },
    decks: {
      word: { title: "Kelime", subtitle: "Word" },
      pronunciation: { title: "Okunuş", subtitle: "Pronunciation" },
      meaning: { title: "Anlam", subtitle: "Meaning" },
      example: { title: "Örnek", subtitle: "Example sentences" },
    },
    sort: {
      dueAsc: "Tekrar tarihi",
      dateDesc: "Eklenme: Yeni → Eski",
      dateAsc: "Eklenme: Eski → Yeni",
    },
    study: {
      cardNotFound: "Kart bulunamadı",
      sessionComplete: "Bu oturumdaki kartları bitirdin",
      examplesComplete: "Bu oturumdaki örnekleri bitirdin",
      restart: "Yeniden Başla",
      backToDecks: "Destelere Dön",
      saveFailed: "Kart kaydedilemedi. Tekrar deneyin.",
      ratings: {
        again: "Again",
        hard: "Hard",
        good: "Good",
        easy: "Easy",
      },
    },
    example: {
      noExample: "Bu kelime için SRS örneği yok.",
      answerPlaceholder: "答え",
    },
    editor: {
      emptyHint:
        "SRS çalışmasında gösterilecek cümleleri buradan ekleyin. HTML yazmanıza gerek yok.",
      addExample: "Örnek ekle",
      importFromDescription: "Mevcut açıklamadan içe aktar",
      exampleSentences: "Örnek cümleler",
      linkAll: "Tümünü eşleştir",
      add: "Ekle",
      exampleN: "Örnek {n}",
      japaneseSentence: "Japonca cümle",
      hideSelection: "Seçili metni gizle",
      selectHeadword: "Ana kelimeyi seç ({headword})",
      linkWords: "Kelime eşleştir",
      srsPreview: "SRS önizleme",
      hintLines: "İpucu satırları",
      highlightSelection: "Seçili metni vurgula",
      addLine: "+ Satır ekle",
      linkFailed:
        "Kelime eşleştirme başarısız. Kuromoji sözlüğü yüklenemedi.",
      placeholders: {
        sentence: "喉が渇きました",
        hint: "Nodo ga kawakimashita",
      },
    },
  },

  wordForm: {
    editTitle: "Kelimeyi Düzenle",
    addTitle: "Yeni Kelime Ekle",
    tabs: {
      general: "Genel",
      srsExamples: "SRS Örnekleri",
    },
    labels: {
      kanji: "Japonca kelime",
      pronunciation: "Okunuş",
      meaning: "Anlam",
      examplesAndNotes: "Örnek cümleler ve notlar",
      relatedWords: "İlişkili kelimeler",
      relatedWordsHint: "(A ≡ B)",
      jlptLevel: "JLPT seviyesi",
      jlptOptional: "(isteğe bağlı)",
      date: "Tarih",
      level: "Seviye",
    },
    actions: {
      generateFromSrs: "SRS örneklerinden oluştur",
      submitAdd: "Ekle",
      submitUpdate: "Güncelle",
    },
    confirmRegenerateDescription:
      "Mevcut açıklama SRS örneklerinden yeniden oluşturulsun mu?",
    placeholders: {
      kanji: "例: 工事",
      pronunciation: "こうじ (kouji)",
      meaning: "TR: İnşaat | EN: Construction",
      description:
        "工事中です。\n--> Kouji-chuu desu.\n--> Construction work in progress.",
    },
  },

  bulkImport: {
    title: "Toplu kelime ekle",
    instructions:
      "HTML tablo yapıştırın. .word, .pronunciation, .meaning, .description ve .jlpt sınıflarından okunur.",
    placeholder: "<table>...</table>",
    pasteTable: "Tablo yapıştır",
    wordsDetected: "{count} kelime algılandı",
    addWords: "{count} kelime ekle",
    linking: "Eşleştiriliyor…",
    adding: "Ekleniyor…",
    importFailed: "Kelime eşleştirme veya içe aktarma başarısız.",
    linkingSkipped:
      "Kelime eşleştirme atlandı; kelimeler yine de eklendi. Ayarlardan örnekleri yeniden eşleştirebilirsiniz.",
    result: {
      totalGiven: "{count} kelime gönderildi",
      added: "✓ {count} yeni kelime eklendi",
      updated: "{count} kelime zaten vardı; alanlar güncellendi:",
    },
    descriptionTitle: "Açıklama",
  },

  settings: {
    title: "Ayarlar",
    sections: "Bölümler",
    styling: {
      nav: "Styling",
      title: "Styling",
      description:
        "Ana tema rengini seçin. Seviye renkleri, yıldız ve vurgular buna göre güncellenir.",
      selected: "Seçili",
    },
    srs: {
      nav: "SRS",
      title: "SRS",
      description: "Örnek cümle destesi ve yazma deneyimi ayarları.",
      wordLinks: {
        label: "Cümledeki bilinen kelimeler",
        description:
          "Veritabanındaki kelimeler cümle içinde noktalı altı çizili görünür; dokununca bilgi paneli açılır.",
      },
      romajiInput: {
        label: "Romaji → kana dönüşümü",
        description:
          "Latin harflerle yazarken otomatik hiragana/katakana dönüşümü (ya → や, arubaito → アルバイト).",
      },
      dailyGoal: {
        label: "Deste bazında günlük hedefler",
        description:
          "Her SRS destesi ve flashcard için ayrı günlük hedef belirleyin. Ana sayfadaki gösterge toplamı gösterir.",
      },
    },
    database: {
      nav: "Veritabanı",
      title: "Veritabanı",
      description: "Yedek alma ve SRS cümlelerini tüm kelimelerle yeniden eşleştirme.",
      backup: {
        title: "Yedek indir",
        description:
          "Kelimeler, ilişkiler ve SRS kart ilerlemesini JSON dosyası olarak indirir.",
        button: "Yedeği indir",
        success: "Yedek dosyası indirildi.",
        failed: "Yedekleme başarısız oldu.",
      },
      relink: {
        title: "Tüm SRS cümlelerini eşleştir",
        description:
          "Veritabanındaki her kelimenin örnek cümlelerini baştan tarar. Sonradan eklediğiniz kelimeler (ör. 勉強) mevcut cümlelerde otomatik bulunur; bağlantılar ve furigana güncellenir.",
        button: "Toplu kelime eşleştir",
        progress: "{done} / {total} kelime…",
        noWords: "SRS örneği olan kelime yok.",
        confirm:
          "{count} kelimenin SRS cümleleri yeniden eşleştirilecek. Yeni eklenen kelimeler de dahil edilir. Devam edilsin mi?",
        success: "{count} kelimenin SRS cümleleri güncellendi.",
        failed:
          "Toplu eşleştirme başarısız. Kuromoji sözlüğünün yüklendiğinden emin olun.",
      },
    },
    language: {
      nav: "Dil",
      title: "Dil",
      description: "Arayüz dilini seçin.",
    },
  },

  dates: {
    monthsFull: [
      "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
      "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
    ],
    monthsShort: [
      "Oca", "Şub", "Mar", "Nis", "May", "Haz",
      "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara",
    ],
    daysFull: [
      "Pazar", "Pazartesi", "Salı", "Çarşamba",
      "Perşembe", "Cuma", "Cumartesi",
    ],
    todayFormat: "{day}, {date} {month} {year}",
    cardDateFormat: "{day} {month} {year}",
    studyDateFormat: "{day} {monthShort} {year}",
  },

  a11y: {
    srs: "SRS",
    settings: "Ayarlar",
    progress: "İlerleme",
    changeLevel: "Seviyeyi değiştir",
    markLearned: "Öğrenildi olarak işaretle",
    unmarkLearned: "Öğrenilenden çıkar",
    starAtLevel5: "Seviye 5'te yıldız verilebilir",
    learningLevel: "Öğrenme seviyesi",
    edit: "Düzenle",
    remove: "Kaldır",
    relatedWords: "İlişkili kelimeler",
    replayAnimation: "Tekrar oynat",
    searchWords: "Kelime ara…",
    strokeOrder: "Yazım sırası",
  },

  kanjiStroke: {
    title: "筆順 · Yazım Sırası",
    loading: "Yükleniyor…",
    svgNotFound: "SVG bulunamadı",
  },

  levelChart: {
    title: "Öğrenme seviyesi",
    starAtLevel5Hint: "Seviye 5'te yıldız atanabilir",
  },

  search: {
    relatedNotFound: '"{query}" için eşleşme yok',
  },

  troubleWords: {
    title: "Zor kelimeler",
    subtitle: "SRS Again ve örnek yanlış cevaplarından otomatik birikir",
    filterAll: "Tümü",
    empty: "Henüz zor kelime yok — Again veya yanlış cevap verince burada görünür.",
    study: "Çalış",
    dismiss: "Havuzdan çıkar",
    lastMistake: "Son hata: {when}",
    today: "bugün",
    yesterday: "dün",
    daysAgo: "{count} gün önce",
    pickDeck: "Hangi deste ile çalışılacak?",
    deckWordCount: "{count} kelime",
    sessionTitle: "Zor kelimeler · {label}",
    noCardsForDeck: "Bu deste için çalışılacak kart yok.",
    loadFailed: "Liste yüklenemedi.",
  },

  progress: {
    title: "İlerleme",
    subtitle: "Çalışma aktivitesi, seviyeler ve JLPT kapsamı",
    sections: {
      heatmap: "Çalışma takvimi",
      deckActivity: "Deste aktivitesi",
      levelDistribution: "Seviye dağılımı",
      jlpt: "JLPT tamamlanma",
    },
    heatmap: {
      tooltip: "{date} · {count} kelime çalışıldı",
      less: "Az",
      more: "Çok",
    },
    miniHeatmap: {
      title: "Son 7 gün",
    },
    deckChart: {
      weekTotal: "Bu hafta {count}",
      empty: "Henüz çalışma kaydı yok.",
    },
    levelMode: {
      word: "Kelime",
      pron: "Okunuş",
      meaning: "Anlam",
    },
    jlpt: {
      untagged: "Etiketsiz",
      noWords: "Kelime yok",
      count: "{learned} / {total} öğrenildi",
    },
  },
};
