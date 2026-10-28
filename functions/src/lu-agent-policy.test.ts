import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {explicitlyRequestsDestination,explicitlyRequestsDraft,explicitlyRequestsOpen,explicitlyRequestsSurfaceSearch,luSearchTerms} from './lu-agent-policy.js';

test('only clear writing requests enable journal search',()=>{
 assert.equal(explicitlyRequestsSurfaceSearch('Find my journal entry about the garden.'),true);
 assert.equal(explicitlyRequestsSurfaceSearch('Can you access my journals?'),false);
 assert.equal(explicitlyRequestsSurfaceSearch('Open Settings.'),false);
 assert.equal(explicitlyRequestsSurfaceSearch('Tell me how Lu works.'),false);
});

test('navigation, opening and drafting require an explicit matching request',()=>{
 assert.equal(explicitlyRequestsDestination('Please take me to Settings.','settings'),true);
 assert.equal(explicitlyRequestsDestination('What is in Settings?','settings'),false);
 assert.equal(explicitlyRequestsDestination('Open Settings.','journal'),false);
 assert.equal(explicitlyRequestsOpen('Open the first entry.'),true);
 assert.equal(explicitlyRequestsOpen('Can you access my journal?'),false);
 assert.equal(explicitlyRequestsDraft('Write a story about a quiet morning.'),true);
 assert.equal(explicitlyRequestsDraft('Write me a weather forecast.'),false);
});

test('search terms exclude generic entity placeholders',()=>{
 assert.deepEqual(luSearchTerms('Find Person A’s journal about the garden at Place A.'),['garden']);
});
