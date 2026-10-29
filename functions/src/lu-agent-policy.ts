const searchStopWords = new Set(['the','and','for','with','about','from','that','this','what','when','where','which','who','why','how','did','does','do','can','could','would','should','you','your','my','me','i','we','our','please','tell','show','find','search','look','open','read','journal','journals','story','stories','entry','entries','write','wrote','saved','recent','latest','access','there','their','was','were','are','is','a','an','to','in','on','of','it','person','people','place','location','organisation','organization','date','time','contact','email','phone','relationship','detail','details']);

const appTopic = /\b(lulu|journal|journals|story|stories|entry|entries|writing|draft|compose|reflection|settings|preferences|account|sign[ -]?in|passkey|google|privacy|scrub(?:bing|bed)?|model|decisions|chat|voice|support|professional|helpline|resources|safety plan|prediction|predict|notification|language|update|download|library|app|application|joernaal|joernale|storie|stories|inskrywing|skryf|instellings|rekening|privaatheid|stem|ondersteuning|hulpbron|veiligheidsplan|voorspelling|taal|opdatering|toepassing|ibhuku|izindaba|bhala|izilungiselelo|i-akhawunti|ubumfihlo|izwi|ukwesekwa|ukuphepha|uhlelo lokusebenza)\b/iu;
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
  if (language === 'Afrikaans') return 'Ek kan gewone Joernaal- en Storie-inskrywings soek wanneer jy my vra. Ek blaai nie outomaties daardeur nie. Beskermde private skryfwerk bly ontoeganklik.';
  if (language === 'isiZulu') return 'Ngingasesha okufakiwe okujwayelekile kuJenali naseZindabeni uma ungicela. Angikubheki ngokuzenzakalelayo. Okubhaliwe okuyimfihlo okuvikelwe akufinyeleleki.';
  return 'I can search ordinary Journal and Story entries when you ask me to. I do not browse them automatically. Protected private writing stays unavailable to me.';
}

export function luSearchTerms(value: string): string[] {
  return [...new Set((value.normalize('NFKC').toLocaleLowerCase('und').match(/[\p{L}\p{N}]{3,}/gu) ?? [])
    .filter(word => !searchStopWords.has(word)))].slice(0,24);
}

export function explicitlyRequestsSurfaceSearch(value: string): boolean {
  const asksToFind = /\b(find|search|look\s+for|read|show\s+me|summari[sz]e|what\s+did\s+i\s+(?:write|say|save)|where\s+did\s+i\s+(?:write|mention)|what\s+does\s+my\s+(?:journal|story|entry)\s+say)\b/iu.test(value);
  const namesWriting = /\b(journal|journals|story|stories|entry|entries|saved\s+writing|what\s+i\s+wrote)\b/iu.test(value);
  return asksToFind && namesWriting;
}

/** Answer access questions accurately without making Lu search the journal. */
export function isJournalAccessCapabilityQuestion(value: string): boolean {
  const asksAboutCapability = /\b(can|could|do|does|are|is|am)\b[^.!?]{0,80}\b(access|browse|see|read|search|look through|look at)\b/iu.test(value);
  const namesJournal = /\b(my|our|the|your)?\s*(journal|journals|story|stories|entry|entries|saved writing)\b/iu.test(value);
  const asksForAnAction = explicitlyRequestsSurfaceSearch(value) || explicitlyRequestsOpen(value);
  return asksAboutCapability && namesJournal && !asksForAnAction;
}

export function explicitlyRequestsOpen(value: string): boolean {
  return /\b(open|read|show\s+me|display)\b/iu.test(value) && /\b(entry|entries|journal|story|stories|result|one)\b/iu.test(value);
}

export function explicitlyRequestsDraft(value: string): boolean {
  return /\b(create|write|start|make|draft)\b/iu.test(value) && /\b(entry|journal|story|note)\b/iu.test(value);
}

export function explicitlyRequestsDestination(value: string, destination: string): boolean {
  if (!/\b(open|go\s+to|take\s+me\s+to|navigate\s+to)\b/iu.test(value)) return false;
  const terms: Record<string,RegExp> = {
    home:/\b(home|dashboard)\b/iu,
    journal:/\b(journal|journals)\b/iu,
    stories:/\b(stories|story collection)\b/iu,
    library:/\b(library|tasks|notes)\b/iu,
    reader:/\b(reader|latest entry)\b/iu,
    write:/\b(write|writing|compose|new entry|new journal|new story)\b/iu,
    settings:/\b(settings|preferences)\b/iu,
    support:/\b(support|resources|helplines|help services|professional support|contact a service)\b/iu,
  };
  return terms[destination]?.test(value) ?? false;
}
