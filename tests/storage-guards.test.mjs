import test from 'node:test';
import assert from 'node:assert/strict';
import {parseStoredArray,preserveCorruptStorage} from '../app/storage-guards.ts';

test('stored arrays load while missing storage becomes empty',()=>{
  assert.deepEqual(parseStoredArray(null),[]);
  assert.deepEqual(parseStoredArray('[1,2]'),[1,2]);
});

test('non-array and malformed storage values are rejected',()=>{
  assert.throws(()=>parseStoredArray('{}'),/array/);
  assert.throws(()=>parseStoredArray('{broken'),SyntaxError);
});

test('corrupt storage is backed up once without overwriting the first copy',()=>{
  const data=new Map();
  const storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
  assert.equal(preserveCorruptStorage(storage,'warehouse','bad-one'),true);
  assert.equal(preserveCorruptStorage(storage,'warehouse','bad-two'),true);
  assert.equal(data.get('warehouse:corrupt-backup'),'bad-one');
});

test('failed corrupt backup prevents later writes',()=>{
  const storage={getItem:()=>null,setItem:()=>{throw new Error('full')}};
  assert.equal(preserveCorruptStorage(storage,'warehouse','bad'),false);
});
