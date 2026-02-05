// IndexedDB wrapper for local-first cricket scoring
// Event-sourced architecture - all state derived from immutable events

const DB_NAME = 'CricketScorerDB';
const DB_VERSION = 1;

// Event types for delivery events
export type DeliveryEventType = 
  | 'DOT' 
  | 'RUN' 
  | 'FOUR' 
  | 'SIX' 
  | 'WIDE' 
  | 'NO_BALL' 
  | 'NO_BALL_FOUR' 
  | 'NO_BALL_SIX' 
  | 'WICKET';

export interface DeliveryEvent {
  id: string;
  matchId: string;
  inningsNumber: number;
  overNumber: number;
  eventType: DeliveryEventType;
  runsScored: number;
  isLegalDelivery: boolean;
  batsmanId: string;
  bowlerId: string;
  timestamp: number;
}

export interface LocalMatch {
  id: string;
  team1Id: string;
  team2Id: string;
  team1Name: string;
  team2Name: string;
  team1ShortName: string;
  team2ShortName: string;
  totalOvers: number;
  status: 'LIVE' | 'INNINGS_BREAK' | 'COMPLETED' | 'PENDING_SYNC';
  winnerId: string | null;
  resultDescription: string | null;
  createdAt: number;
  completedAt: number | null;
  syncedAt: number | null;
}

export interface LocalInnings {
  matchId: string;
  inningsNumber: number;
  battingTeamId: string;
  bowlingTeamId: string;
  isCompleted: boolean;
}

export interface LocalPlayer {
  id: string;
  name: string;
  teamId: string;
}

export interface LocalBatsmanState {
  playerId: string;
  inningsNumber: number;
  matchId: string;
  battingOrder: number;
  isOut: boolean;
}

export interface LocalBowlerState {
  playerId: string;
  inningsNumber: number;
  matchId: string;
  overNumbers: number[]; // Which overs this bowler has bowled
}

// Database instance
let db: IDBDatabase | null = null;

export async function initDB(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Delivery events store (immutable, append-only)
      if (!database.objectStoreNames.contains('deliveryEvents')) {
        const eventsStore = database.createObjectStore('deliveryEvents', { keyPath: 'id' });
        eventsStore.createIndex('byMatch', 'matchId', { unique: false });
        eventsStore.createIndex('byMatchInnings', ['matchId', 'inningsNumber'], { unique: false });
        eventsStore.createIndex('byTimestamp', 'timestamp', { unique: false });
      }

      // Local matches store
      if (!database.objectStoreNames.contains('matches')) {
        const matchesStore = database.createObjectStore('matches', { keyPath: 'id' });
        matchesStore.createIndex('byStatus', 'status', { unique: false });
      }

      // Local innings store
      if (!database.objectStoreNames.contains('innings')) {
        const inningsStore = database.createObjectStore('innings', { keyPath: ['matchId', 'inningsNumber'] });
        inningsStore.createIndex('byMatch', 'matchId', { unique: false });
      }

      // Players cache
      if (!database.objectStoreNames.contains('players')) {
        const playersStore = database.createObjectStore('players', { keyPath: 'id' });
        playersStore.createIndex('byTeam', 'teamId', { unique: false });
      }

      // Batsman state per innings
      if (!database.objectStoreNames.contains('batsmanState')) {
        const batsmanStore = database.createObjectStore('batsmanState', { 
          keyPath: ['matchId', 'inningsNumber', 'playerId'] 
        });
        batsmanStore.createIndex('byMatchInnings', ['matchId', 'inningsNumber'], { unique: false });
      }

      // Bowler state per innings
      if (!database.objectStoreNames.contains('bowlerState')) {
        const bowlerStore = database.createObjectStore('bowlerState', { 
          keyPath: ['matchId', 'inningsNumber', 'playerId'] 
        });
        bowlerStore.createIndex('byMatchInnings', ['matchId', 'inningsNumber'], { unique: false });
      }
    };
  });
}

// Generate unique ID
export function generateId(): string {
  // Generate a proper UUID v4 format for Supabase compatibility
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ============== DELIVERY EVENTS ==============

export async function addDeliveryEvent(event: DeliveryEvent): Promise<void> {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('deliveryEvents', 'readwrite');
    const store = tx.objectStore('deliveryEvents');
    const request = store.add(event);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function removeLastDeliveryEvent(matchId: string, inningsNumber: number): Promise<DeliveryEvent | null> {
  const database = await initDB();
  
  // Get all events for this innings
  const events = await getDeliveryEvents(matchId, inningsNumber);
  if (events.length === 0) return null;
  
  // Find the last event by timestamp
  const lastEvent = events.reduce((latest, e) => e.timestamp > latest.timestamp ? e : latest);
  
  // Delete it
  return new Promise((resolve, reject) => {
    const tx = database.transaction('deliveryEvents', 'readwrite');
    const store = tx.objectStore('deliveryEvents');
    const request = store.delete(lastEvent.id);
    request.onsuccess = () => resolve(lastEvent);
    request.onerror = () => reject(request.error);
  });
}

export async function getDeliveryEvents(matchId: string, inningsNumber?: number): Promise<DeliveryEvent[]> {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('deliveryEvents', 'readonly');
    const store = tx.objectStore('deliveryEvents');
    
    let request: IDBRequest;
    if (inningsNumber !== undefined) {
      const index = store.index('byMatchInnings');
      request = index.getAll([matchId, inningsNumber]);
    } else {
      const index = store.index('byMatch');
      request = index.getAll(matchId);
    }
    
    request.onsuccess = () => {
      const events = request.result as DeliveryEvent[];
      // Sort by timestamp
      events.sort((a, b) => a.timestamp - b.timestamp);
      resolve(events);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getAllMatchEvents(matchId: string): Promise<DeliveryEvent[]> {
  return getDeliveryEvents(matchId);
}

// ============== MATCHES ==============

export async function saveMatch(match: LocalMatch): Promise<void> {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('matches', 'readwrite');
    const store = tx.objectStore('matches');
    const request = store.put(match);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getMatch(matchId: string): Promise<LocalMatch | null> {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('matches', 'readonly');
    const store = tx.objectStore('matches');
    const request = store.get(matchId);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function getMatchesByStatus(status: LocalMatch['status']): Promise<LocalMatch[]> {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('matches', 'readonly');
    const store = tx.objectStore('matches');
    const index = store.index('byStatus');
    const request = index.getAll(status);
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteMatch(matchId: string): Promise<void> {
  const database = await initDB();
  
  // Delete match
  await new Promise<void>((resolve, reject) => {
    const tx = database.transaction('matches', 'readwrite');
    const store = tx.objectStore('matches');
    const request = store.delete(matchId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  
  // Delete all events for this match
  const events = await getDeliveryEvents(matchId);
  const database2 = await initDB();
  await new Promise<void>((resolve, reject) => {
    const tx = database2.transaction('deliveryEvents', 'readwrite');
    const store = tx.objectStore('deliveryEvents');
    events.forEach(e => store.delete(e.id));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ============== INNINGS ==============

export async function saveInnings(innings: LocalInnings): Promise<void> {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('innings', 'readwrite');
    const store = tx.objectStore('innings');
    const request = store.put(innings);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getInnings(matchId: string, inningsNumber: number): Promise<LocalInnings | null> {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('innings', 'readonly');
    const store = tx.objectStore('innings');
    const request = store.get([matchId, inningsNumber]);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function getMatchInnings(matchId: string): Promise<LocalInnings[]> {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('innings', 'readonly');
    const store = tx.objectStore('innings');
    const index = store.index('byMatch');
    const request = index.getAll(matchId);
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

// ============== PLAYERS ==============

export async function savePlayer(player: LocalPlayer): Promise<void> {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('players', 'readwrite');
    const store = tx.objectStore('players');
    const request = store.put(player);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function savePlayers(players: LocalPlayer[]): Promise<void> {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('players', 'readwrite');
    const store = tx.objectStore('players');
    players.forEach(p => store.put(p));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPlayer(playerId: string): Promise<LocalPlayer | null> {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('players', 'readonly');
    const store = tx.objectStore('players');
    const request = store.get(playerId);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function getTeamPlayers(teamId: string): Promise<LocalPlayer[]> {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('players', 'readonly');
    const store = tx.objectStore('players');
    const index = store.index('byTeam');
    const request = index.getAll(teamId);
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

// ============== BATSMAN STATE ==============

export async function saveBatsmanState(state: LocalBatsmanState): Promise<void> {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('batsmanState', 'readwrite');
    const store = tx.objectStore('batsmanState');
    const request = store.put(state);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getBatsmenState(matchId: string, inningsNumber: number): Promise<LocalBatsmanState[]> {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('batsmanState', 'readonly');
    const store = tx.objectStore('batsmanState');
    const index = store.index('byMatchInnings');
    const request = index.getAll([matchId, inningsNumber]);
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

// ============== BOWLER STATE ==============

export async function saveBowlerState(state: LocalBowlerState): Promise<void> {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('bowlerState', 'readwrite');
    const store = tx.objectStore('bowlerState');
    const request = store.put(state);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getBowlersState(matchId: string, inningsNumber: number): Promise<LocalBowlerState[]> {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('bowlerState', 'readonly');
    const store = tx.objectStore('bowlerState');
    const index = store.index('byMatchInnings');
    const request = index.getAll([matchId, inningsNumber]);
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

// ============== UTILITY ==============

export async function clearAllData(): Promise<void> {
  const database = await initDB();
  const storeNames = ['deliveryEvents', 'matches', 'innings', 'players', 'batsmanState', 'bowlerState'];
  
  for (const storeName of storeNames) {
    await new Promise<void>((resolve, reject) => {
      const tx = database.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}
