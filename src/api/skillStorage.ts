import { SlimeSkill, MemoryEntry, MemoryCategory, DEFAULT_GLUTTONY_SKILL } from '../slime/types';

const SKILLS_DB_NAME = 'Slime-skills';
const SKILLS_STORE = 'skills';
const MEMORY_DB_NAME = 'Slime-memory';
const MEMORY_STORE = 'memory';
const DB_VERSION = 1;

let skillsDB: IDBDatabase | null = null;
let memoryDB: IDBDatabase | null = null;

async function openSkillsDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (skillsDB) resolve(skillsDB);
    const request = indexedDB.open(SKILLS_DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      skillsDB = request.result;
      resolve(skillsDB);
    };
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(SKILLS_STORE)) {
        db.createObjectStore(SKILLS_STORE, { keyPath: 'id' });
      }
    };
  });
}

async function openMemoryDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (memoryDB) resolve(memoryDB);
    const request = indexedDB.open(MEMORY_DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      memoryDB = request.result;
      resolve(memoryDB);
    };
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(MEMORY_STORE)) {
        db.createObjectStore(MEMORY_STORE, { keyPath: 'id' });
      }
    };
  });
}

export async function loadSkills(): Promise<SlimeSkill[]> {
  try {
    const db = await openSkillsDB();
    return new Promise((resolve) => {
      const tx = db.transaction(SKILLS_STORE, 'readonly');
      const store = tx.objectStore(SKILLS_STORE);
      const request = store.getAll();
      request.onsuccess = () => {
        const skills = request.result as SlimeSkill[];
        let gluttony = skills.find(s => s.id === 'gluttony-skill');
        if (!gluttony) {
          gluttony = { ...DEFAULT_GLUTTONY_SKILL, createdAt: Date.now() };
        }
        resolve([gluttony, ...skills.filter(s => s.id !== 'gluttony-skill')]);
      };
      request.onerror = () => resolve([DEFAULT_GLUTTONY_SKILL]);
    });
  } catch {
    return [DEFAULT_GLUTTONY_SKILL];
  }
}

export async function saveSkill(skill: SlimeSkill): Promise<void> {
  const db = await openSkillsDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SKILLS_STORE, 'readwrite');
    const store = tx.objectStore(SKILLS_STORE);
    const request = store.put(skill);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteSkill(skillId: string): Promise<void> {
  if (skillId === 'gluttony-skill') return;
  const db = await openSkillsDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SKILLS_STORE, 'readwrite');
    const store = tx.objectStore(SKILLS_STORE);
    const request = store.delete(skillId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function updateSkillFeedback(skillId: string, thumbsUp: boolean): Promise<void> {
  const db = await openSkillsDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SKILLS_STORE, 'readwrite');
    const store = tx.objectStore(SKILLS_STORE);
    const getReq = store.get(skillId);
    getReq.onsuccess = () => {
      const skill = getReq.result as SlimeSkill;
      if (skill) {
        if (thumbsUp) skill.thumbsUp++;
        else skill.thumbsDown++;
        skill.level = Math.floor(Math.log2(skill.thumbsUp + 1)) + 1;
        if (skill.thumbsUp >= 20) skill.level = 2;
        if (skill.thumbsUp >= 50) skill.level = 3;
        if (skill.thumbsUp >= 100) skill.level = 4;
        if (skill.thumbsUp >= 200) skill.level = 5;
        if (skill.thumbsUp >= 500) skill.level = 6;
        if (skill.thumbsUp >= 1000) skill.level = 7;
        if (skill.thumbsUp >= 2000) skill.level = 8;
        if (skill.thumbsUp >= 5000) skill.level = 9;
        if (skill.thumbsUp >= 10000) skill.level = 10;
        store.put(skill);
      }
      resolve();
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

export async function loadMemory(category?: MemoryCategory): Promise<MemoryEntry[]> {
  try {
    const db = await openMemoryDB();
    return new Promise((resolve) => {
      const tx = db.transaction(MEMORY_STORE, 'readonly');
      const store = tx.objectStore(MEMORY_STORE);
      const request = store.getAll();
      request.onsuccess = () => {
        let entries = request.result as MemoryEntry[];
        if (category) {
          entries = entries.filter(e => e.category === category);
        }
        resolve(entries.sort((a, b) => b.createdAt - a.createdAt));
      };
      request.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function saveMemoryEntry(entry: MemoryEntry): Promise<void> {
  const db = await openMemoryDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MEMORY_STORE, 'readwrite');
    const store = tx.objectStore(MEMORY_STORE);
    const request = store.put(entry);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteMemoryEntry(entryId: string): Promise<void> {
  const db = await openMemoryDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MEMORY_STORE, 'readwrite');
    const store = tx.objectStore(MEMORY_STORE);
    const request = store.delete(entryId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getLastMemoryTimestamp(): Promise<number> {
  try {
    const entries = await loadMemory();
    if (entries.length === 0) return 0;
    return Math.max(...entries.map(e => e.createdAt));
  } catch {
    return 0;
  }
}
