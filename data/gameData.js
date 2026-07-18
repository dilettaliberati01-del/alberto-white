// ════════════════════════════════════════════
//   ALBERTO WHITE — Banca delle Parole
//   250+ parole suddivise per categoria
//   Dedicate ad Alberto CTF, Bassano Romano
// ════════════════════════════════════════════

const wordBank = {

  // ─────────────────────────────────────────
  universita: {
    name: "🎓 Università & Esami",
    emoji: "🎓",
    words: [
      "Esame orale", "Appello", "Verbalizzazione", "CFU", "Professore",
      "Assistente", "Relatore", "Commissione", "Bocciatura", "Lode",
      "Tirocinio", "Dispensa", "Appunti", "Biblioteca", "Aula magna",
      "Fuoricorso", "Laurea", "Tesi", "Domanda trabocchetto", "Sessione estiva",
      "Pre-appello", "Libretto universitario", "Piano di studi", "Media pesata",
      "Segreteria studentesca", "Tesina", "Propedeutico", "Esame scritto",
      "Giornata inaugurale", "Aula piena", "Banco occupato", "Professoressa severa",
      "Voto umiliante", "30 con lode", "Ritiro dall'esame", "Firma del registro",
      "Orale a sorpresa", "Domanda fuori programma", "Risposta incerta",
      "Silenzio in aula", "Sbagliato l'anno accademico"
    ]
  },

  // ─────────────────────────────────────────
  farmacologia: {
    name: "💊 Farmacologia",
    emoji: "💊",
    words: [
      "GABA", "Recettore", "Agonista", "Antagonista", "Neurotrasmettitore",
      "Sinapsi", "Dose", "Farmaco", "Farmacodinamica", "Farmacocinetica",
      "Benzodiazepina", "Placebo", "Sedazione", "Memoria", "Cervello",
      "Neurone", "Ansiolitico", "Trasmissione sinaptica", "Effetto paradosso",
      "Emivita", "Biodisponibilità", "Metabolismo epatico", "Clearance renale",
      "EC50", "Modulazione allosterica", "Potenziale d'azione", "Canale ionico",
      "Recettore GABA-A", "Ipermemoria", "Curva dose-risposta",
      "Finestra terapeutica", "Effetto collaterale", "Tolleranza farmacologica",
      "Dipendenza", "Serotonina", "Dopamina", "Acetilcolina", "Glutammato",
      "Inibizione", "Eccitazione neuronale"
    ]
  },

  // ─────────────────────────────────────────
  chimica: {
    name: "⚗️ Chimica Organica",
    emoji: "⚗️",
    words: [
      "Benzene", "Alcano", "Alchene", "Alchino", "Aldeide",
      "Chetone", "Estere", "Ammide", "Sintesi organica", "Reazione",
      "Solvente", "Catalizzatore", "Carbonio", "Stereochimica", "Isomero",
      "Distillazione", "Cromatografia", "Provetta", "Becher", "Enantiomero",
      "Sostituzione nucleofila", "Aromaticità", "Reattivo di Grignard",
      "Ossidazione", "Riduzione", "NMR", "Resa percentuale",
      "Spettroscopia", "Carbonio chirale", "Meccanismo di reazione",
      "Legame covalente", "Gruppo funzionale", "Struttura di Lewis",
      "Risonanza magnetica", "Alcool", "Acido carbossilico",
      "Anello benzenico", "Doppio legame", "Radicale libero", "Elettrofilo"
    ]
  },

  // ─────────────────────────────────────────
  laboratorio: {
    name: "🔬 Laboratorio & Ricerca",
    emoji: "🔬",
    words: [
      "Esperimento", "Campione", "Analisi", "Protocollo", "Incubatore",
      "Centrifuga", "Pipetta", "Reagente", "Pubblicazione", "Articolo scientifico",
      "Peer review", "Statistica", "Dati sperimentali", "Grafico", "Microscopio",
      "Studio", "Gruppo controllo", "Replicazione", "Cappa chimica",
      "Guanti da laboratorio", "Bilancia analitica", "Coltura cellulare",
      "Spettrofotometro", "HPLC", "Gel elettroforesi",
      "Campione contaminato", "Risultato inatteso", "Errore sistematico",
      "Deviazione standard", "Valore anomalo", "Numero di campioni",
      "Test t di Student", "P-value", "Ipotesi nulla", "Western blot",
      "Soluzione tampone", "Centrifugazione", "Autoclave", "Freeze-drying",
      "Stoccaggio a -80°C"
    ]
  },

  // ─────────────────────────────────────────
  ratti: {
    name: "🐀 Ratti & Neuroscienze",
    emoji: "🐀",
    words: [
      "Ratto", "Gabbia", "Memoria", "Ipermemoria", "Corteccia cerebrale",
      "Ippocampo", "Comportamento", "Stimolo", "Apprendimento", "Test comportamentale",
      "Modello animale", "Osservazione", "Monitoraggio", "Maschio", "Femmina",
      "Differenze sessuali", "Neuroscienze", "Labirinto di Morris", "Ratto Wistar",
      "Estinzione condizionata", "Memoria di paura", "Protocollo etologico",
      "Pellet", "Anestesia", "Sacrificio sperimentale", "Stress acuto",
      "Stress cronico", "Modello preclinico", "Comitato etico",
      "Open field test", "Elevated plus maze", "Condizionamento alla paura",
      "Registrazione neuronale", "Elettrodo", "Optogenetica",
      "Neurofisiologia", "Sinapsi ippocampale", "LTP", "LTD",
      "Potenziale di campo", "Amnesia retrograda"
    ]
  },

  // ─────────────────────────────────────────
  dottorato: {
    name: "📚 Dottorato & Carriera",
    emoji: "📚",
    words: [
      "Dottorato", "Professore universitario", "Pubblicazione", "Congresso",
      "Seminario", "Docente", "Ricercatore", "Borsa di studio", "Dipartimento",
      "Revisore anonimo", "Citazione", "Carriera accademica", "Tutor",
      "Conferenza internazionale", "Progetto di ricerca", "Grant",
      "Impact factor", "H-index", "Abilitazione scientifica",
      "Professore associato", "Professore ordinario", "Tenure track",
      "Poster scientifico", "Abstract", "Finanziamento europeo",
      "Ateneo", "Commissione scientifica", "Call for papers",
      "Lettera di raccomandazione", "Curriculum vitae", "Lab meeting",
      "Annual report", "Visiting researcher", "Post-doc",
      "Sabbatical", "Laboratorio aperto", "Progetto PRIN",
      "Erasmus ricerca", "Dottorato europeo", "Defense della tesi"
    ]
  },

  // ─────────────────────────────────────────
  sfortuna: {
    name: "😱 Sfortuna Universitaria",
    emoji: "😱",
    words: [
      "Bocciatura", "Domanda impossibile", "Professore severo", "Appello saltato",
      "Errore di stampa", "Ansia da prestazione", "Notte insonne", "Voto basso",
      "Prenotazione sbagliata", "Microfono spento", "Slide mancanti",
      "Calendario cambiato", "Ritardo al treno", "Panico da esame", "Imprevisto",
      "Sfiga cosmica", "Disastro totale", "Figuraccia in aula", "Stress cronico",
      "Trauma da esame", "Computer scarico", "File corrotto", "Treno perso",
      "Professore assente", "Esame spostato", "Commissione ostile",
      "Silenzio imbarazzante", "Risposta sbagliata", "Tema fuori programma",
      "Blocco mentale totale", "Ritardo accidentale", "Libretto dimenticato",
      "Esame annullato all'ultimo", "Biro esaurita durante lo scritto",
      "Internet che cade durante la prova online",
      "Sbagliare aula", "Rifiutare il voto e poi pentirsene",
      "Finire il tempo con metà domande in bianco",
      "Il professore ti chiama proprio te", "Risposta giusta data troppo piano"
    ]
  },

  // ─────────────────────────────────────────
  bassano: {
    name: "🏘️ Bassano Romano",
    emoji: "🏘️",
    words: [
      "Bassano Romano", "Piazza del paese", "Borgo antico", "Fontana", "Festa patronale",
      "Campagna laziale", "Bar del paese", "Sagra", "Tuscia", "Viterbo",
      "Piazzetta", "Trattoria", "Amici di paese", "Castagne",
      "Porchetta", "Osteria locale", "Campagna", "Dialetto locale",
      "Palazzo Odescalchi", "Lago di Vico", "Cimino", "Capranica",
      "Ronciglione", "Sutri", "Nepi", "Stazione ferroviaria", "Corriera",
      "Tarquinia", "Civita di Bagnoregio", "Monti Cimini",
      "Marroni arrosto", "Polenta", "Cacciagione", "Vendemmia",
      "Festa del patrono", "Campane della chiesa", "Palio locale"
    ]
  },

  // ─────────────────────────────────────────
  dialetto: {
    name: "🗣️ Dialetto & Modi di Dire",
    emoji: "🗣️",
    words: [
      "Aho!", "Mo'", "'Na cifra", "Annà", "Daje",
      "A posto così", "Che roba", "Vabbè", "Aò",
      "Me cojoni", "Non me ne frega", "Zitto zitto",
      "Piano piano", "Hai rotto", "A fa' niente", "Lascia perdere",
      "Tengo fame", "Che te devo dì", "Embè", "'Ndo vai",
      "Mica male", "Stai a capì?", "Mo' che famo?", "Ammazza",
      "Guarda un po'", "Quanto cazzo", "Te pareva", "Non ci siamo",
      "Dai lascia stare", "Tutto a posto", "Bona lì"
    ]
  },

  // ─────────────────────────────────────────
  alberto: {
    name: "👨‍🔬 La Vita di Alberto",
    emoji: "👨‍🔬",
    words: [
      "Caffè della mensa", "Notte prima dell'esame", "Dispense condivise",
      "WhatsApp di facoltà", "Corsa all'ultimo appello",
      "Aula 2 ore prima per trovare posto", "Ripassino last-minute",
      "Biro che finisce durante lo scritto", "Dimenticare il tesserino",
      "Orario cambiato il giorno prima", "Gruppo studio che non studia",
      "Stampare la tesi a mezzanotte", "Relatore irreperibile",
      "Citare una fonte sbagliata", "Mangiare alla mensa universitaria",
      "Trovare posto in biblioteca il giorno prima degli esami",
      "Pipettare per 3 ore di fila", "Ratto che non collabora",
      "Dati che non tornano", "Grafico sbagliato in tesi",
      "Professore che ti manda via dopo 3 domande",
      "Comprare il libro il giorno prima e non aprirlo",
      "Esame a giugno in aula senza aria condizionata",
      "Scoprire il programma sbagliato a metà sessione",
      "Il relatore che risponde solo il venerdì sera",
      "Presentazione con le diapositive in bianco e nero",
      "PowerPoint che crasha durante la discussione",
      "Tornare a Bassano dopo un esame disastroso",
      "Raccontare l'esame al bar del paese", "Sognare il dottorato da bambino"
    ]
  }
};

module.exports = { wordBank };
