import { CoreMaps, GetCurrentMap } from "../coreMaps";

console.log('=== TEST CoreMaps ===\n');

// Test 1: init CoreMaps
console.log('\nTest 1: init CoreMaps');
const coreMaps = new CoreMaps();
console.log('CoreMaps initialized');
console.log('_allData', CoreMaps._allData instanceof Map);
console.log('_testData', CoreMaps._testData instanceof Map);
console.log('_obj', CoreMaps._obj instanceof Map);
console.log('_env', CoreMaps._env instanceof Map);
console.log('_dbQueries', CoreMaps._dbQueries instanceof Map);
console.log('_txn', CoreMaps._txn instanceof Map);

// Test 2: Singleton pattern - init 2nd times should not create new maps
console.log('\nTest 2: Singleton pattern - init 2nd times should not create new maps');
CoreMaps._testData.set('key1', 'value1');
const coreMaps2 = new CoreMaps();
console.log('Data still exists:', CoreMaps._testData.get('key1'));

// Test 3: Add data into Maps
console.log('\nTest 3: Add data into Maps');
CoreMaps._env.set('API_URL', 'https://api.example.com');
CoreMaps._obj.set('LoginPage', { username: "#user", password: "#pass"});
CoreMaps._dbQueries.set('getUser', 'SELECT * FROM users WHERE id = ?');
console.log('_env:', CoreMaps._env.get('API_URL'));
console.log('_obj:', CoreMaps._obj.get('LoginPage'));
console.log('_dbQueries:', CoreMaps._dbQueries.get('getUser'));

// Test 4: GetCurrentMap wrapper
console.log('\nTest 4: GetCurrentMap wrapper');
const envMap = new GetCurrentMap(() => CoreMaps._env);
envMap.set('BASE_URL', 'https://www.example.com');
console.log('set() works:', envMap.get('BASE_URL') === 'https://www.example.com');
console.log('has() works:', envMap.has('BASE_URL') === true);
console.log('has() works with invalid key:', envMap.has('INVALID_KEY') === false);

// Test 5: Multiple GetcurrentMap instances pointing to 1 Map
console.log('\nTest 5: Multiple GetcurrentMap instances pointing to 1 Map');
const envMap1 = new GetCurrentMap(() => CoreMaps._env);
const envMap2 = new GetCurrentMap(() => CoreMaps._env)
envMap1.set('SHARED_KEY', 'https://www.example.com');
console.log('envMap1 set SHARED_KEY:', envMap1.get('SHARED_KEY') === 'https://www.example.com');
console.log('envMap2 get SHARED_KEY:', envMap2.get('SHARED_KEY') === 'https://www.example.com');
console.log('pointing to the same map:', envMap1.get('SHARED_KEY') === envMap2.get('SHARED_KEY'));

console.log('\n=== TEST CoreMaps COMPLETED ===\n');
