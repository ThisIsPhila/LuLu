import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {explicitlyRequestsDestination,explicitlyRequestsDraft,explicitlyRequestsLuDestination,explicitlyRequestsOpen,explicitlyRequestsSurfaceSearch,inferLuLanguage,isJournalAccessCapabilityQuestion,isLuLuScopeRequest,journalAccessCapabilityReply,luNavigationReply,luSurfaceSearchReply,outOfScopeReply,luSearchTerms} from './lu-agent-policy.js';

test('reply language follows supported language in the scrubbed message',()=>{
 assert.equal(inferLuLanguage('Person A, kan jy my help om hierdie joernaal te vind?'),'Afrikaans');
 assert.equal(inferLuLanguage('Ngicela ungitholele okubhaliwe kwami kujenali.'),'isiZulu');
 assert.equal(inferLuLanguage('Person A, can you help me find my journal?'),'English');
});

test('only clear writing requests enable journal search',()=>{
 assert.equal(explicitlyRequestsSurfaceSearch('Find my journal entry about the garden.'),true);
 assert.equal(explicitlyRequestsSurfaceSearch('Soek my joernaal oor die tuin.'),true);
 assert.equal(explicitlyRequestsSurfaceSearch('Thola engikubhalile kujenali mayelana nengadi.'),true);
 assert.equal(explicitlyRequestsSurfaceSearch('Ngibhale ini mayelana nengadi?'),true);
 assert.equal(explicitlyRequestsSurfaceSearch('Can you access my journals?'),false);
 assert.equal(explicitlyRequestsSurfaceSearch('Open Settings.'),false);
 assert.equal(explicitlyRequestsSurfaceSearch('Tell me how Lu works.'),false);
});

test('journal access questions explain the available tool without searching',()=>{
 assert.equal(isJournalAccessCapabilityQuestion('Can you not access my journals?'),true);
 assert.equal(isJournalAccessCapabilityQuestion('Can you access my journals?'),true);
 assert.equal(isJournalAccessCapabilityQuestion('Can you read my journal?'),true);
 assert.equal(isJournalAccessCapabilityQuestion('Find my journal entry about the garden.'),false);
 assert.equal(isJournalAccessCapabilityQuestion('Kan jy my joernaal lees?'),true);
 assert.equal(isJournalAccessCapabilityQuestion('Ungakwazi ukufunda ijenali yami?'),true);
 assert.match(journalAccessCapabilityReply('English'),/search ordinary Journal and Story entries when you ask/i);
 assert.match(journalAccessCapabilityReply('English'),/Find my journal entry about the garden/i);
 assert.match(journalAccessCapabilityReply('Afrikaans'),/wanneer jy my vra/);
 assert.match(journalAccessCapabilityReply('Afrikaans'),/Soek my joernaalinskrywing oor die tuin/i);
 assert.match(journalAccessCapabilityReply('isiZulu'),/uma ungicela/);
 assert.match(journalAccessCapabilityReply('isiZulu'),/Thola okufakiwe kwami kweJenali mayelana nengadi/i);
});

test('navigation, opening and drafting require an explicit matching request',()=>{
 assert.equal(explicitlyRequestsDestination('Please take me to Settings.','settings'),true);
 assert.equal(explicitlyRequestsDestination('What is in Settings?','settings'),false);
 assert.equal(explicitlyRequestsDestination('Open Settings.','journal'),false);
 assert.equal(explicitlyRequestsDestination('Neem my na Instellings.','settings'),true);
 assert.equal(explicitlyRequestsDestination('Ngiyise kuzilungiselelo.','settings'),true);
 assert.equal(explicitlyRequestsOpen('Open the first entry.'),true);
 assert.equal(explicitlyRequestsOpen('Can you access my journal?'),false);
 assert.equal(explicitlyRequestsOpen('Maak die eerste joernaalinskrywing oop.'),true);
 assert.equal(explicitlyRequestsOpen('Vula indaba yokuqala.'),true);
 assert.equal(explicitlyRequestsDraft('Write a story about a quiet morning.'),true);
 assert.equal(explicitlyRequestsDraft('Skryf ’n storie oor ’n stil oggend.'),true);
 assert.equal(explicitlyRequestsDraft('Bhala indaba emayelana nokusa okunokuthula.'),true);
 assert.equal(explicitlyRequestsDraft('Write me a weather forecast.'),false);
});

test('explicit text navigation and requests to find professional support map to app destinations',()=>{
 assert.equal(explicitlyRequestsLuDestination('Please take me to Settings.'),'settings');
 assert.equal(explicitlyRequestsLuDestination('Help me find professional support.'),'support');
 assert.equal(explicitlyRequestsLuDestination('Kontak ’n berader.'),'support');
 assert.equal(explicitlyRequestsLuDestination('Ngitholele umeluleki.'),'support');
 assert.equal(explicitlyRequestsLuDestination('I need professional support.'),null);
 assert.equal(explicitlyRequestsLuDestination('What is in Settings?'),null);
 assert.match(luNavigationReply('Afrikaans'),/maak daardie afdeling/);
 assert.match(luNavigationReply('isiZulu'),/Ngivula leyo ngxenye/);
});

test('search terms exclude generic entity placeholders',()=>{
 assert.deepEqual(luSearchTerms('Find Person A’s journal about the garden at Place A.'),['garden']);
});

test('direct journal searches return clear localized results without a model-generated claim',()=>{
 assert.match(luSurfaceSearchReply('English',2),/possible matches.*scrubbed excerpts.*Select a result/is);
 assert.match(luSurfaceSearchReply('English',0),/couldn’t find a safe, matching excerpt/i);
 assert.match(luSurfaceSearchReply('Afrikaans',1),/moontlike gewone joernaal- of storie-inskrywings/);
 assert.match(luSurfaceSearchReply('Afrikaans',0),/veilige, ooreenstemmende gewone joernaal/);
 assert.match(luSurfaceSearchReply('isiZulu',1),/Ngithole okufakiwe okujwayelekile/);
 assert.match(luSurfaceSearchReply('isiZulu',0),/Angitholanga amazwibela aphephile/);
});

test('text assistant has a server-side LuLu scope gate with contextual follow-ups',()=>{
 assert.equal(isLuLuScopeRequest('Can you open my journal?'),true);
 assert.equal(isLuLuScopeRequest('Soek my joernaal oor die tuin.'),true);
 assert.equal(isLuLuScopeRequest('Ngibhale ini mayelana nengadi?'),true);
 assert.equal(isLuLuScopeRequest('How do I use privacy processing in LuLu?'),true);
 assert.equal(isLuLuScopeRequest('What is the weather today?'),false);
 assert.equal(isLuLuScopeRequest('What is the weather today?', [{role:'assistant',text:'I can help with your LuLu journal.'}]),false);
 assert.equal(isLuLuScopeRequest('Please do that', [{role:'assistant',text:'I can help you open your journal in LuLu.'}]),true);
 assert.equal(isLuLuScopeRequest('Please do that'),false);
 assert.equal(isLuLuScopeRequest('Sawubona'),true);
 assert.match(outOfScopeReply('Afrikaans'),/Ek is Lu/);
 assert.match(outOfScopeReply('isiZulu'),/NginguLu/);
});
