const searchStopWords = new Set([
  'the','and','for','with','about','from','that','this','what','when','where','which','who','why','how','did','does','do','can','could','would','should','you','your','my','me','i','we','our','please','tell','show','find','search','look','open','read','journal','journals','story','stories','entry','entries','write','wrote','saved','recent','latest','access','there','their','was','were','are','is','a','an','to','in','on','of','it',
  'person','people','place','location','organisation','organization','date','time','contact','email','phone','relationship','detail','details',
  // Common Afrikaans and isiZulu request words and names for writing surfaces.
  'die','en','vir','met','oor','van','wat','wanneer','waar','wie','hoekom','hoe','het','kan','kon','wil','moet','jy','jou','my','ek','ons','asseblief','vertel','wys','soek','vind','lees','open','maak','dagboek','joernaal','joernale','storie','verhaal','inskrywing','inskrywings','geskryf','gesê','gestoor','onlangse','jongste',
  'ngicela','ngitshele','ngibonise','thola','sesha','funda','ibhuku','ijenali','izindaba','indaba','umbhalo','imibhalo','okubhaliwe','engikubhalile','yami','wami','yakho','ngibhale','ngabhala','ngathi','mayelana','kanye','futhi','ku','ka','no','na','uma','ingabe','ungakwazi','uyakwazi','ngingakwazi','ngicela'
]);

const appTopic = /\b(lulu|journal|journals|story|stories|entry|entries|writing|draft|compose|reflection|settings|preferences|account|sign[ -]?in|passkey|google|privacy|scrub(?:bing|bed)?|model|decisions|chat|voice|support|professional|helpline|resources|safety plan|prediction|predict|notification|language|update|download|library|app|application|joernaal|joernale|dagboek|storie|verhaal|inskrywing|skryf|instellings|rekening|privaatheid|stem|ondersteuning|hulpbron|veiligheidsplan|voorspelling|taal|opdatering|toepassing|ibhuku|ijenali|izindaba|indaba|umbhalo|imibhalo|bhala|ngibhale|ngabhala|ngikubhalile|engikubhalile|thola|sesha|izilungiselelo|i-akhawunti|ubumfihlo|izwi|ukwesekwa|ukuphepha|uhlelo lokusebenza)\b/iu;
const unrelatedTopic = /\b(weather|forecast|news|politics|election|recipe|stock price|sports score|math homework|write code|programming|translate this|what is the capital|current events|weather|weer|nuus|politiek|resep|weerberig|izindaba zanamuhla|isimo sezulu)\b/iu;
const greetingOnly = /^\s*(hi|hello|hey|good morning|good afternoon|good evening|howzit|hallo|môre|goeiemôre|goeiedag|sawubona|sani)\s*[!.?]*\s*$/iu;
const continuationOnly = /^\s*(yes|yeah|yep|no|nope|okay|ok|please do|please do that|do that|go ahead|tell me more|continue|thanks|thank you|ja|nee|goed|gaan voort|ngiyavuma|yebo|cha|qhubeka|ngicela uqhubeke)\s*[!.?]*\s*$/iu;

/** Keep Lu's text entry point focused on LuLu instead of relying only on a model prompt. */
export function isLuLuScopeRequest(value: string, history: readonly {role:'user'|'assistant';text:string}[] = []): boolean {
  if (unrelatedTopic.test(value) && !appTopic.test(value)) return false;
  if (appTopic.test(value) || greetingOnly.test(value)) return true;
  if (!continuationOnly.test(value)) return false;
  return history.some(item => item.role === 'assistant' && appTopic.test(item.text));
}

export function outOfScopeReply(language: string): string {
  if (language === 'Afrikaans') return 'Ek is Lu, jou gids binne LuLu. Ek kan help met joernaalinskrywings wat jy kies om te deel, en met LuLu se bladsye, privaatheid en hulpmiddels. Ek help nie met onderwerpe buite die toepassing nie.';
  if (language === 'isiZulu') return 'NginguLu, umsizi wakho ngaphakathi kwe-LuLu. Ngingakusiza ngokusebenzisa i-LuLu, ngemibhalo oyikhethayo ukwabelana ngayo, nangobumfihlo nezinsiza zohlelo lokusebenza. Angiphenduli ngezihloko ezingaphandle kohlelo lokusebenza.';
  return 'I’m Lu, your guide inside LuLu. I can help with LuLu’s pages and tools or writing you choose to share. I can’t help with topics outside the app.';
}

export function journalAccessCapabilityReply(language: string): string {
  if (language === 'Afrikaans') return 'Ek kan gewone Joernaal- en Storie-inskrywings soek wanneer jy my vra. Probeer: “Soek my joernaalinskrywing oor die tuin.” Ek blaai nie outomaties daardeur nie, en beskermde private skryfwerk bly ontoeganklik.';
  if (language === 'isiZulu') return 'Ngingasesha okufakiwe okujwayelekile kuJenali naseZindabeni uma ungicela. Zama ukuthi: “Thola okufakiwe kwami kweJenali mayelana nengadi.” Angikubheki ngokuzenzakalelayo, futhi okubhaliwe okuyimfihlo okuvikelwe akufinyeleleki.';
  return 'I can search ordinary Journal and Story entries when you ask. Try: “Find my journal entry about the garden.” I do not browse them automatically, and protected private writing stays unavailable.';
}

/** Stable user-facing response for explicit searches that the server executes directly. */
export function luSurfaceSearchReply(language: string, matchCount: number): string {
  const found = matchCount > 0;
  if (language === 'Afrikaans') {
    return found
      ? 'Ek het moontlike gewone joernaal- of storie-inskrywings gevind. Die gesuiwerde uittreksels verskyn hieronder. Kies ’n resultaat hieronder om die inskrywing oop te maak.'
      : 'Ek kon nie ’n veilige, ooreenstemmende gewone joernaal- of storie-uittreksel vind nie. Probeer asseblief ’n ander onderwerp.';
  }
  if (language === 'isiZulu') {
    return found
      ? 'Ngithole okufakiwe okujwayelekile okungase kuhambisane nalokho. Izingcaphuno ezisusiwe imininingwane ziboniswe ngezansi. Khetha umphumela ongezansi ukuze uvule okubhaliwe.'
      : 'Angitholanga amazwibela aphephile, afanayo okufakiwe okujwayelekile kuJenali noma endabeni. Zama esinye isihloko.';
  }
  return found
    ? 'I found possible matches in your ordinary Journal or Story entries. Scrubbed excerpts appear below. Select a result to open its entry.'
    : 'I couldn’t find a safe, matching excerpt in your ordinary Journal or Story entries. Please try another topic.';
}

export function luNavigationReply(language: string): string {
  if (language === 'Afrikaans') return 'Ek maak daardie afdeling in LuLu nou oop.';
  if (language === 'isiZulu') return 'Ngivula leyo ngxenye ye-LuLu manje.';
  return 'Opening that LuLu section now.';
}

export function luSearchTerms(value: string): string[] {
  return [...new Set((value.normalize('NFKC').toLocaleLowerCase('und').match(/[\p{L}\p{N}]{3,}/gu) ?? [])
    .filter(word => !searchStopWords.has(word)))].slice(0,24);
}

export function explicitlyRequestsSurfaceSearch(value: string): boolean {
  const asksToFind = /\b(find|search|look\s+for|read|show\s+me|summari[sz]e|what\s+did\s+i\s+(?:write|say|save)|where\s+did\s+i\s+(?:write|mention)|what\s+does\s+my\s+(?:journal|story|entry)\s+say|tell\s+me\s+what\s+i\s+(?:wrote|saved)|soek|vind|wys\s+(?:vir\s+)?my|lees|som\s+op|wat\s+het\s+ek\s+(?:geskryf|gesê|gestoor)|waar\s+het\s+ek\s+(?:geskryf|genoem)|wat\s+staan\s+in\s+my|thola|sesha|ngitholele|ngibonise|funda|ngibhale\s+ini|ngabhala\s+ini|ngikubhalile|uphi\s+engibhale|yini\s+engibhale)\b/iu.test(value);
  const namesWriting = /\b(journal|journals|story|stories|entry|entries|saved\s+writing|what\s+i\s+wrote|what\s+did\s+i\s+(?:write|say|save)|joernaal(?:inskrywings?)?|joernale|dagboek|storie|verhaal|inskrywing|inskrywings|geskrifte|wat\s+ek\s+geskryf\s+het|wat\s+het\s+ek\s+geskryf|ijenali|ibhuku|izindaba|indaba|umbhalo|imibhalo|okubhaliwe|engikubhalile|ngibhale\s+ini|ngabhala\s+ini)\b/iu.test(value);
  return asksToFind && namesWriting;
}

/** Answer access questions accurately without making Lu search the journal. */
export function isJournalAccessCapabilityQuestion(value: string): boolean {
  const asksAboutCapability = /\b(can|could|do|does|are|is|am|kan|kon|mag|kan\s+j(y|ulle)|kan\s+ek|ungakwazi|uyakwazi|ngingakwazi|ingabe)\b[^.!?]{0,100}\b(access|browse|see|read|search|look\s+through|look\s+at|toegang|blaai|sien|lees|soek|toegang\s+kry|finyelela|bheka|funda|ukufunda|thola|ukusesha)\b/iu.test(value);
  const namesJournal = /\b(?:my|our|the|your|ons|die|jou|yami|wami|yakho|i)?\s*(?:journal|journals|story|stories|entry|entries|saved writing|joernaal(?:inskrywings?)?|joernale|dagboek|storie|verhaal|inskrywing|inskrywings|ijenali|ibhuku|izindaba|indaba|umbhalo|imibhalo|okubhaliwe)\b/iu.test(value);
  // A capability question such as “Can you read my journal?” is not itself
  // authorization to search. A clear “find/search/show me” request is.
  const asksForAnAction = explicitlyRequestsSurfaceSearch(value) && !asksAboutCapability;
  return asksAboutCapability && namesJournal && !asksForAnAction;
}

export function explicitlyRequestsOpen(value: string): boolean {
  const asksToOpen = /\b(open|read|show\s+me|display|maak\s+oop|wys\s+my|lees|vula|ngivulele|ngibonise)\b/iu.test(value) || /\bmaak\b[^.!?]{0,80}\boop\b/iu.test(value);
  return asksToOpen && /\b(entry|entries|journal|story|stories|result|one|inskrywing|inskrywings|dagboek|joernaal(?:inskrywing)?|storie|verhaal|ijenali|ibhuku|indaba|izindaba|umbhalo|imibhalo|okubhaliwe|lokuqala|eyokuqala)\b/iu.test(value);
}

export function explicitlyRequestsDraft(value: string): boolean {
  return /\b(create|write|start|make|draft|skep|skryf|begin|maak|opstel|dala|bhala|qala)\b/iu.test(value) && /\b(entry|journal|story|note|inskrywing|joernaal|dagboek|storie|verhaal|nota|ijenali|ibhuku|indaba|umbhalo|imibhalo)\b/iu.test(value);
}

export function explicitlyRequestsDestination(value: string, destination: string): boolean {
  if (destination === 'support' && /\b(find|show\s+me|contact|call|reach|help\s+me\s+(?:find|contact)|connect\s+me\s+with|soek|wys\s+my|kontak|skakel|help\s+my\s+om\s+te\s+(?:vind|kontak)|verbind\s+my\s+met|thola|ngitholele|ngikhombise|ngixhumanise|xhumana|shayela|ngisize\s+ngithole)\b[^.!?]{0,100}\b(professional|therapist|counsell?or|social\s+worker|support|help|helpline|crisis|berader|maatskaplike\s+werker|ondersteuning|hulplyn|krisis|umeluleki|usizo|ukwesekwa|umugqa\s+wosizo)\b/iu.test(value)) return true;
  if (!/\b(open|go\s+to|take\s+me\s+to|navigate\s+to|maak\s+oop|neem\s+my\s+na|gaan\s+na|vula|ngiyise|ngiyisa)\b/iu.test(value)) return false;
  const terms: Record<string,RegExp> = {
    home:/\b(home|dashboard|tuis|ikhaya|ekuqaleni)\b/iu,
    journal:/\b(journal|journals|joernaal|joernale|dagboek|ijenali|ibhuku)\b/iu,
    stories:/\b(stories|story collection|storie|verhaal|izindaba|indaba)\b/iu,
    library:/\b(library|tasks|notes|biblioteek|take|notas|umsebenzi|imisebenzi|amanothi)\b/iu,
    reader:/\b(reader|latest entry|leser|jongste inskrywing|umbhali|okubhaliwe kokugcina)\b/iu,
    write:/\b(write|writing|compose|new entry|new journal|new story|skryf|nuwe inskrywing|nuwe joernaal|nuwe storie|bhala|umbhalo omusha|qala ukubhala)\b/iu,
    settings:/\b(settings|preferences|instellings|voorkeure|izilungiselelo|kuzilungiselelo)\b/iu,
    support:/\b(support|resources|helplines|help services|professional support|contact a service|ondersteuning|hulpbronne|hulplyne|usizo|izinsiza|ukwesekwa)\b/iu,
  };
  return terms[destination]?.test(value) ?? false;
}

// Check destinations whose words overlap command verbs (for example “take”
// in “take me to Settings”) before the broader Library vocabulary.
const luDestinations = ['home','journal','stories','settings','library','reader','write','support'] as const;
export type LuDestination = (typeof luDestinations)[number];
export function explicitlyRequestsLuDestination(value: string): LuDestination | null {
  return luDestinations.find(destination => explicitlyRequestsDestination(value,destination)) ?? null;
}
